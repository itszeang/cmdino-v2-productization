import { useState } from "react";
import { SpriteAnimator } from "../dino/SpriteAnimator";
import { DINO_STATE_MAP } from "../config/dinoStateMap";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { SessionLogEvent } from "../domain/sessionLog";
import type { HealthSnapshot } from "../domain/health";
import type { ReadinessFailure } from "../domain/readiness";
import { getAgentCwdHealth } from "../domain/agentCwd";

// ── Helpers ───────────────────────────────────────────────────────────────────

type DinoStateName = keyof typeof DINO_STATE_MAP;

function lifecycleToDinoState(lc: string): DinoStateName {
  switch (lc) {
    case "running":  return "patrol_running";
    case "spawning": return "patrol_running";
    case "error":    return "terminal_error";
    case "exited":
    case "killed":   return "terminal_dead";
    default:         return "idle_center";
  }
}

function deriveAttention(
  agent:           TerminalAgent,
  lc:              string,
  readinessErrors: Record<string, ReadinessFailure | null>,
  healthSnapshot:  HealthSnapshot,
  sessionEntries:  SessionLogEvent[],
  selectedProjectRoot?: string,
): "error" | "warn" | null {
  if (lc === "error") return "error";
  if (getAgentCwdHealth({ agentCwd: agent.cwd, selectedProjectRoot }).status === "different") return "warn";
  const tail = sessionEntries.slice(-60);
  for (let i = tail.length - 1; i >= 0; i--) {
    const e = tail[i];
    if (e.type === "runtime_error" &&
        (e.agentRuntimeId === agent.id || e.agentConfigId === agent.configId)) {
      return "error";
    }
  }
  if (readinessErrors[agent.id] != null) return "warn";
  const kind = agent.agentKind;
  if (kind && kind !== "custom") {
    const prov = healthSnapshot.providers[kind as keyof HealthSnapshot["providers"]];
    if (prov) {
      const bad: typeof prov.status[] = ["missing", "auth_required", "offline", "error"];
      if (bad.includes(prov.status)) return "warn";
    }
  }
  return null;
}

function lastEvent(
  entries:  SessionLogEvent[],
  agent:    TerminalAgent,
): SessionLogEvent | null {
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    if (e.agentRuntimeId === agent.id || e.agentConfigId === agent.configId) return e;
  }
  return null;
}

function fmtEvent(e: SessionLogEvent): string {
  switch (e.type) {
    case "agent_created":    return "Created";
    case "terminal_start":   return "Started";
    case "terminal_restart": return "Restarted";
    case "terminal_kill":    return "Killed";
    case "terminal_exited":  return "Exited";
    case "terminal_error":   return "Process error";
    case "runtime_error":
      return e.payload.title ? String(e.payload.title) : "Runtime error";
    case "manual_handoff":   return "Output forwarded";
    case "auto_forward":     return "Auto-forwarded";
    case "manual_send":      return "File sent";
    default:                 return e.type.replace(/_/g, " ");
  }
}

function relTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000)     return "just now";
  if (d < 3_600_000)  return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

const LC_COLOR: Record<string, string> = {
  dormant:  "var(--text-faint)",
  spawning: "var(--warning)",
  running:  "var(--text-main)",
  exited:   "var(--text-faint)",
  killed:   "var(--text-faint)",
  error:    "var(--danger)",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  agents:             TerminalAgent[];
  selectedProjectRoot?: string;
  activeTerminalId:   string | null;
  lifecycleByAgentId: Record<string, string>;
  sessionEntries:     SessionLogEvent[];
  healthSnapshot:     HealthSnapshot;
  readinessErrors:    Record<string, ReadinessFailure | null>;
  animationSpeed?:              number;
  onSelectAgent:                (id: string) => void;
  pendingInteractionsByAgentId?: Record<string, number>;
}

// ── Component ─────────────────────────────────────────────────────────────────

type TooltipPos = { agentId: string; left: number; top: number };

export function AgentDock({
  agents,
  selectedProjectRoot,
  activeTerminalId,
  lifecycleByAgentId,
  sessionEntries,
  healthSnapshot,
  readinessErrors,
  animationSpeed = 1,
  onSelectAgent,
  pendingInteractionsByAgentId = {},
}: Props) {
  const [tooltip, setTooltip] = useState<TooltipPos | null>(null);

  if (agents.length === 0) return null;

  const tooltipAgent = tooltip ? agents.find((a) => a.id === tooltip.agentId) ?? null : null;

  return (
    <>
      <div className="agent-dock">
        {agents.map((agent) => {
          const lc       = lifecycleByAgentId[agent.id] ?? "dormant";
          const isActive = agent.id === activeTerminalId;
          const state    = lifecycleToDinoState(lc);
          const animRef  = DINO_STATE_MAP[state];
          const attn     = deriveAttention(agent, lc, readinessErrors, healthSnapshot, sessionEntries, selectedProjectRoot);
          const cwdHealth = getAgentCwdHealth({ agentCwd: agent.cwd, selectedProjectRoot });
          const lcColor  = LC_COLOR[lc] ?? "var(--text-faint)";

          const pendingInteractionCount = pendingInteractionsByAgentId[agent.id] ?? 0;

          return (
            <button
              key={agent.id}
              className="agent-dock-item"
              data-active={String(isActive)}
              data-lifecycle={lc}
              data-attn={attn ?? ""}
              data-kind={agent.agentKind ?? "custom"}
              data-interaction={pendingInteractionCount > 0 ? "pending" : ""}
              onClick={() => onSelectAgent(agent.id)}
              onMouseEnter={(e) => {
                const r = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                setTooltip({
                  agentId: agent.id,
                  left:    Math.min(r.left, window.innerWidth - 265),
                  top:     r.bottom + 6,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {/* Dino avatar */}
              <div className="agent-dock-avatar">
                <SpriteAnimator
                  dinoId={agent.dinoId}
                  category={animRef.category}
                  animName={animRef.name}
                  displayScale={0.3}
                  animationSpeed={animationSpeed}
                />
                {attn && (
                  <div
                    className="agent-dock-attn"
                    data-attn={attn}
                    style={{
                      background: attn === "error" ? "var(--status-error)" : "var(--status-warning)",
                    }}
                  />
                )}
              </div>

              {/* Interaction badge */}
              {pendingInteractionCount > 0 && (
                <span
                  className="agent-dock-interaction-badge"
                  title={`${pendingInteractionCount} pending input`}
                >
                  !
                </span>
              )}

              {/* Label + lifecycle */}
              <div className="agent-dock-info">
                <span className="agent-dock-label">{agent.label}</span>
                <span
                  className="agent-dock-lc"
                  data-lc={cwdHealth.status === "different" ? "warn" : lc}
                  style={{ color: cwdHealth.status === "different" ? "var(--status-warning)" : lcColor }}
                >
                  {cwdHealth.status === "different" ? "cwd warning" : lc}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Fixed tooltip — outside overflow context */}
      {tooltip && tooltipAgent && (() => {
        const agent    = tooltipAgent;
        const lc       = lifecycleByAgentId[agent.id] ?? "dormant";
        const attn     = deriveAttention(agent, lc, readinessErrors, healthSnapshot, sessionEntries, selectedProjectRoot);
        const cwdHealth = getAgentCwdHealth({ agentCwd: agent.cwd, selectedProjectRoot });
        const lcColor  = LC_COLOR[lc] ?? "var(--text-faint)";
        const ev       = lastEvent(sessionEntries, agent);
        const rdFail   = readinessErrors[agent.id];

        return (
          <div
            className="agent-dock-tooltip"
            style={{ position: "fixed", top: tooltip.top, left: tooltip.left }}
            onMouseEnter={() => setTooltip(null)}
          >
            <div className="agent-dock-tooltip-name">{agent.label}</div>
            <div className="agent-dock-tooltip-row">
              <span className="agent-dock-tooltip-key">kind</span>
              {agent.agentKind ?? "custom"}
            </div>
            <div className="agent-dock-tooltip-row">
              <span className="agent-dock-tooltip-key">lifecycle</span>
              <span style={{ color: lcColor }}>{lc}</span>
            </div>
            <div className="agent-dock-tooltip-row">
              <span className="agent-dock-tooltip-key">cwd</span>
              <span style={{ color: cwdHealth.status === "different" ? "var(--status-warning)" : "var(--text-main)" }}>
                {cwdHealth.label}
              </span>
            </div>
            <div className="agent-dock-tooltip-row">
              <span className="agent-dock-tooltip-key">path</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {agent.cwd ?? "No cwd configured"}
              </span>
            </div>
            {ev && (
              <div className="agent-dock-tooltip-row">
                <span className="agent-dock-tooltip-key">last</span>
                {fmtEvent(ev)}
                <span className="agent-dock-tooltip-ts">{relTime(ev.ts)}</span>
              </div>
            )}
            {attn && (
              <div className={`agent-dock-tooltip-issue agent-dock-tooltip-issue--${attn}`}>
                {rdFail?.message
                  ?? (cwdHealth.status === "different" ? cwdHealth.warning
                  : lc === "error" ? "Process error"
                  : attn === "error" ? "Runtime error"
                  : "Provider or readiness issue")}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
