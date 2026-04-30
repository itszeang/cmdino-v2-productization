import { useState, useRef, useEffect, useCallback } from "react";
import { DinoLane, type DinoVisualPhase } from "../dino/DinoLane";
import { LogsPanel }       from "./LogsPanel";
import { HandoffModal }    from "./HandoffModal";
import type { TerminalAgent }   from "../domain/terminalAgent";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import { fileBridge }      from "../orchestration/fileBridge";
import type { WorkflowLink, WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";
import { terminalBridge }  from "../terminal/terminalBridge";
import {
  useTerminalProcess,
  type TerminalLifecycleState,
} from "../terminal/useTerminalProcess";

// ── Colour maps ───────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  patrol_running:   "#e5e5e5",
  heavy_processing: "#d4d4d4",
  review_scan:      "#fbbf24",
  success_signal:   "#86efac",
  handoff_signal:   "#86efac",
  terminal_error:   "#fca5a5",
  terminal_dead:    "#6b7280",
  idle_center:      "#737373",
};

const LIFECYCLE_COLORS: Record<TerminalLifecycleState, string> = {
  dormant:  "#737373",
  spawning: "#fbbf24",
  running:  "#e5e5e5",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#fca5a5",
};

const VIEW_MODE_DINO_SCALE: Record<TerminalViewMode, number> = {
  focus: 1.25,
  grid: 0.85,
};

function dotColor(s: string) { return STATE_COLORS[s] ?? "#737373"; }
function lcLabel(lc: TerminalLifecycleState) { return lc.toUpperCase(); }

// ── Shared button primitives ──────────────────────────────────────────────────

function HdrBtn({
  title, onClick, onMouseDown, children, danger = false,
}: {
  title: string; onClick: () => void;
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode; danger?: boolean;
}) {
  return (
    <button
      title={title} onClick={onClick} onMouseDown={onMouseDown}
      style={{ background: "transparent", border: "none", color: "var(--text-faint)", fontSize: 12,
        lineHeight: 1, cursor: "pointer", padding: "4px 6px", borderRadius: 999,
        fontFamily: "inherit", transition: "background 0.12s, color 0.12s", flexShrink: 0 }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-bg)";
        b.style.color = danger ? "var(--danger)" : "var(--text-main)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "transparent";
        b.style.color = "var(--text-faint)";
      }}
    >{children}</button>
  );
}

function StripBtn({
  onClick, disabled = false, accent = false, title, children,
}: {
  onClick: () => void; disabled?: boolean; accent?: boolean;
  title?: string; children: React.ReactNode;
}) {
  const base  = accent ? "var(--accent)" : "var(--text-muted)";
  const bdBase = accent ? "var(--border-strong)" : "var(--border-subtle)";
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        background: accent && !disabled ? "var(--button-bg)" : "transparent",
        border: `1px solid ${disabled ? "transparent" : bdBase}`,
        color: disabled ? "var(--text-faint)" : base,
        fontSize: 10, padding: "4px 9px", borderRadius: 999,
        fontFamily: "inherit", fontWeight: 600, letterSpacing: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, whiteSpace: "nowrap", transition: "background 0.1s, color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-hover)";
        b.style.color = "var(--text-main)";
        b.style.borderColor = "var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = accent && !disabled ? "var(--button-bg)" : "transparent";
        b.style.color = disabled ? "var(--text-faint)" : base;
        b.style.borderColor = disabled ? "var(--border-subtle)" : bdBase;
      }}
    >{children}</button>
  );
}

// ── Preview state type ────────────────────────────────────────────────────────

interface PreviewState {
  content:   string | null;
  truncated: boolean;
  loading:   boolean;
  error:     string | null;
}
const PREVIEW_IDLE: PreviewState = { content: null, truncated: false, loading: false, error: null };

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  agent:                TerminalAgent;
  onRemove:             (id: string) => void;
  isRunning:            boolean;
  onStart:              () => void;
  allAgents:            TerminalAgent[];
  runningAgentIds:      Set<string>;
  onAddAttachment:      (path: string) => void;
  onRemoveAttachment:   (attachmentId: string) => void;
  onLifecycleChange:    (agentId: string, lifecycle: TerminalLifecycleState) => void;
  onRecordWorkflowLink: (sourceAgentId: string, targetAgentId: string, kind: WorkflowLinkKind) => void;
  onEditAgent:          (id: string) => void;
  settings?:            AppSettings;
  viewMode:             TerminalViewMode;
  isActive:             boolean;
  onFocus?:             () => void;
  workflowLinks:        WorkflowLink[];
  onFocusTarget:        (id: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalPane({
  agent, onRemove, isRunning, onStart,
  allAgents, runningAgentIds, onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink, onEditAgent,
  settings,
  viewMode, isActive, onFocus,
  workflowLinks, onFocusTarget,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dinoState, lifecycle,
    copyVisible, restart, kill,
    getSessionLogs, focusTerminal,
    sendInput, captureSelectedOrLastLines, captureLastOutputBlock,
  } = useTerminalProcess({
    agentId:   agent.id,
    containerRef,
    cwd:       agent.cwd,
    launchCommand: agent.launchCommand,
    agentKind: agent.agentKind,
    enabled:   isRunning,
    fontScale: settings?.terminalFontScale ?? 1,
  });

  // Report lifecycle changes upward for WorkflowPanel display
  useEffect(() => {
    onLifecycleChange(agent.id, lifecycle);
  }, [agent.id, lifecycle, onLifecycleChange]);

  // ── Egg → hatch → dino spawn sequence ─────────────────────────────────────
  // Tracks which visual phase we're in so DinoLane shows egg assets before
  // the PTY is live, then briefly plays the hatch animation on first spawn.
  const lifecycleRef = useRef<TerminalLifecycleState>(lifecycle);
  const [dinoVisualPhase, setDinoVisualPhase] = useState<DinoVisualPhase>("egg_idle");

  useEffect(() => {
    lifecycleRef.current = lifecycle;

    if (lifecycle === "dormant") {
      setDinoVisualPhase("egg_idle");
      return;
    }

    if (lifecycle === "spawning") {
      setDinoVisualPhase((phase) => phase === "dino" ? "dino" : "egg_hatching");
      return;
    }

    if (lifecycle === "running") {
      setDinoVisualPhase((phase) => phase === "egg_idle" ? "egg_hatching" : phase);
      return;
    }

    if (lifecycle === "error" || lifecycle === "exited" || lifecycle === "killed") {
      setDinoVisualPhase("dino");
    }
  }, [lifecycle]);

  const handleEggHatchComplete = useCallback(() => {
    if (lifecycleRef.current === "running") {
      setDinoVisualPhase("dino");
    }
  }, []);

  // Derived dino state passed to DinoLane — overrides runtime dinoState
  // while dormant/spawning so the egg asset is shown instead of the dino.
  // ── UI state ───────────────────────────────────────────────────────────────

  const [showLogs,       setShowLogs]       = useState(false);
  const [handoffCapture, setHandoffCapture] = useState<string | null>(null);

  // Orchestration strip state
  const [selectedAttId, setSelectedAttId] = useState<string | null>(null);
  const [showAddPath,   setShowAddPath]   = useState(false);
  const [addInput,      setAddInput]      = useState("");
  const [addError,      setAddError]      = useState("");
  const [preview,       setPreview]       = useState<PreviewState>(PREVIEW_IDLE);

  // Forward state
  const [selectedForwardTargetId, setSelectedForwardTargetId] = useState<string | null>(null);
  const [fwdError,   setFwdError]   = useState("");
  const [forwarding, setForwarding] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────

  const color         = dotColor(dinoState);
  const lcColor       = LIFECYCLE_COLORS[lifecycle];
  const pulse         = dinoState === "patrol_running" || dinoState === "heavy_processing";
  const showLifecycle = lifecycle !== "running";
  const dinoScale     = (settings?.dinoScale ?? 1) * VIEW_MODE_DINO_SCALE[viewMode];
  // isAlive: lifecycle-based, from useTerminalProcess — use this for all action enable checks
  const isAlive        = lifecycle === "running" || lifecycle === "spawning";
  const runningTargets = allAgents.filter((a) => a.id !== agent.id && runningAgentIds.has(a.id));

  // Defensive: attachments may be undefined on agents created before schema migration
  const atts = agent.attachments ?? [];

  // Auto-select: explicit > first available — never blocked by null selectedAttId
  const selectedAtt    = atts.find((a) => a.id === selectedAttId) ?? atts[0] ?? null;
  const effectiveSelId = selectedAtt?.id ?? null;
  const hasAtt         = selectedAtt !== null;

  const showPreviewArea = preview.loading || preview.content !== null || preview.error !== null;

  // Forward target derivation
  const otherTerminals = allAgents.filter((a) => a.id !== agent.id);
  const outgoingLink   = workflowLinks.find(
    (l) => l.kind === "handoff" && l.sourceConfigId === agent.configId,
  );
  const linkedTarget = outgoingLink
    ? allAgents.find((a) => a.configId === outgoingLink.targetConfigId && a.id !== agent.id) ?? null
    : null;
  const effectiveFwdTarget =
    linkedTarget ??
    otherTerminals.find((a) => a.id === selectedForwardTargetId) ??
    otherTerminals[0] ??
    null;
  const targetIsRunning = effectiveFwdTarget != null && runningAgentIds.has(effectiveFwdTarget.id);

  // ── Strip actions ──────────────────────────────────────────────────────────

  function selectChip(att: TerminalAttachment) {
    if (selectedAttId === att.id) {
      setSelectedAttId(null);
      setPreview(PREVIEW_IDLE);
    } else {
      setSelectedAttId(att.id);
      setPreview(PREVIEW_IDLE); // clear stale preview on chip change
    }
  }

  function handleAddPath() {
    const p = addInput.trim();
    if (!p) return;
    if (!attachmentKindFromPath(p)) {
      setAddError("Only .md and .txt files allowed.");
      return;
    }
    onAddAttachment(p);
    setAddInput("");
    setAddError("");
    setShowAddPath(false);
  }

  async function handlePreview() {
    if (!selectedAtt) return;
    setPreview({ content: null, truncated: false, loading: true, error: null });
    try {
      const r = await fileBridge.readPreview(selectedAtt.path);
      setPreview({ content: r.content, truncated: r.truncated, loading: false, error: null });
    } catch (err) {
      setPreview({ content: null, truncated: false, loading: false,
        error: err instanceof Error ? err.message : String(err) });
    }
  }

  async function handleSendAtt() {
    if (!selectedAtt || !isAlive) return;
    try {
      const r = await fileBridge.readPreview(selectedAtt.path);
      sendInput(r.content);
    } catch (err) {
      alert(`Read failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleOpenHandoff() {
    setHandoffCapture(captureSelectedOrLastLines(50));
  }

  async function handleForwardToNext() {
    if (!effectiveFwdTarget || !isAlive || !targetIsRunning || forwarding) return;
    setFwdError("");
    const raw = captureLastOutputBlock().trimEnd();
    if (!raw) { setFwdError("Nothing clean to forward."); return; }
    const captured = raw.length > 32768 ? raw.slice(0, 32768) : raw;
    setForwarding(true);
    try {
      await terminalBridge.write(effectiveFwdTarget.id, captured);
      onRecordWorkflowLink(agent.id, effectiveFwdTarget.id, "handoff");
      onFocusTarget(effectiveFwdTarget.id);
    } catch (err) {
      setFwdError(err instanceof Error ? err.message : String(err));
    } finally {
      setForwarding(false);
    }
  }

  // ── Lifecycle header actions ───────────────────────────────────────────────

  async function handleRemove() {
    if (isAlive && !window.confirm(`Kill "${agent.label}"?`)) return;
    await kill();
    onRemove(agent.id);
  }

  async function handleRestart() {
    if (isAlive && !window.confirm(`Restart "${agent.label}"?`)) return;
    await restart();
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      background: "var(--surface-1)", border: "1px solid var(--border-subtle)",
      borderRadius: 12, overflow: "hidden", height: "100%",
      boxShadow: "none", position: "relative",
    }}>

      {/* ── Header — lifecycle only ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", rowGap: 6,
        padding: "8px 10px",
        background: "var(--surface-1)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
      }}>
        <div
          className={pulse ? "status-dot-pulse" : undefined}
          style={{
            width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: dinoState !== "terminal_dead" && dinoState !== "idle_center"
              ? `0 0 0 2px ${color}1f` : "none",
            transition: "background 0.25s, box-shadow 0.25s",
          }}
        />
        <span style={{
          color: "var(--text-main)", fontWeight: 600, fontSize: 12, letterSpacing: 0,
          flex: "1 1 150px", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {agent.label}
        </span>
        {showLifecycle && (
          <span style={{
            color: lcColor,
            fontSize: 10, letterSpacing: 0, fontWeight: 600,
            transition: "color 0.25s", flexShrink: 0,
          }}>
            {lcLabel(lifecycle).toLowerCase()}
          </span>
        )}
        <HdrBtn title="Copy visible output" onClick={() => { void copyVisible(); }}>⎘</HdrBtn>
        <HdrBtn title="View session logs" onClick={() => setShowLogs(true)}
          onMouseDown={(e) => e.preventDefault()}>≡</HdrBtn>
        <HdrBtn title="Restart terminal" onClick={() => { void handleRestart(); }}>↺</HdrBtn>
        {onFocus && (
          <HdrBtn
            title={viewMode === "focus" && isActive ? "Restore grid" : "Focus this terminal"}
            onClick={onFocus}
          >
            {viewMode === "focus" && isActive ? (
              /* restore-to-grid: 2×2 squares */
              <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" style={{ display: "block" }}>
                <rect x="1"   y="1"   width="3.5" height="3.5" rx="0.5" />
                <rect x="5.5" y="1"   width="3.5" height="3.5" rx="0.5" />
                <rect x="1"   y="5.5" width="3.5" height="3.5" rx="0.5" />
                <rect x="5.5" y="5.5" width="3.5" height="3.5" rx="0.5" />
              </svg>
            ) : (
              /* expand/focus: diagonal arrow with corner brackets */
              <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                <path d="M5.5 1H9v3.5M4.5 9H1V5.5M9 1L1 9"/>
              </svg>
            )}
          </HdrBtn>
        )}
        <HdrBtn title="Agent Settings" onClick={() => onEditAgent(agent.id)}>
          <svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" style={{ display: "block" }}>
            <path d="M5 3.2a1.8 1.8 0 1 0 0 3.6A1.8 1.8 0 0 0 5 3.2zm3.7-.5-.5-.87-.87.5A3.2 3.2 0 0 0 6 2.02V1h-2v1.02a3.2 3.2 0 0 0-1.33.31l-.87-.5-.5.87.87.5A3.2 3.2 0 0 0 1.83 5H.8v1h1.03a3.2 3.2 0 0 0 .31 1.33l-.87.5.5.87.87-.5A3.2 3.2 0 0 0 4 9.17V10h2V9.17a3.2 3.2 0 0 0 1.33-.3l.87.5.5-.87-.87-.5A3.2 3.2 0 0 0 8.17 7H9.2V6H8.17A3.2 3.2 0 0 0 7.87 4.7l.83-.5z"/>
          </svg>
        </HdrBtn>
        <HdrBtn title="Close terminal" onClick={() => { void handleRemove(); }} danger>✕</HdrBtn>
      </div>

      {/* ── Orchestration strip ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", rowGap: 6,
        padding: "8px 10px",
        background: "var(--surface-0)", borderBottom: "1px solid var(--border-subtle)",
        flexShrink: 0, minHeight: 36,
      }}>
        {/* Attach skill button */}
        <StripBtn onClick={() => { setShowAddPath((v) => !v); setAddError(""); }} title="Attach a .md or .txt skill file">
          + ATTACH
        </StripBtn>

        <span style={{ color: "var(--border-subtle)", fontSize: 12, flexShrink: 0 }}>|</span>

        {/* Attachment chips */}
        <div style={{
          display: "flex", gap: 4, flex: "1 1 220px",
          overflowX: "auto", alignItems: "center", minWidth: 140,
        }}>
          {atts.length === 0 ? (
            <span style={{ color: "var(--text-faint)", fontSize: 9, letterSpacing: 0.6, whiteSpace: "nowrap" }}>
              no attachments
            </span>
          ) : (
            atts.map((att) => {
              const active = effectiveSelId === att.id;
              return (
                <div key={att.id} style={{ display: "flex", alignItems: "center", gap: 0, flexShrink: 0 }}>
                  <button
                    onClick={() => selectChip(att)}
                    title={att.path}
                    style={{
                      background: active ? "var(--button-bg)" : "transparent",
                      border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                      borderRight: "none",
                      color: active ? "var(--text-main)" : "var(--text-muted)",
                      fontSize: 10, padding: "4px 7px",
                      borderRadius: "999px 0 0 999px",
                      cursor: "pointer", fontFamily: "inherit",
                      letterSpacing: 0, flexShrink: 0,
                      transition: "background 0.1s, border-color 0.1s, color 0.1s",
                    }}
                  >
                    {att.path.startsWith("cmdino-preset://") && (
                      <span className="chip-brain-badge">BRAIN</span>
                    )}
                    {att.fileName}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveAttachment(att.id); if (selectedAttId === att.id) { setSelectedAttId(null); setPreview(PREVIEW_IDLE); } }}
                    title="Remove attachment"
                    style={{
                      background: active ? "var(--button-bg)" : "transparent",
                      border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                      color: "var(--text-faint)",
                      fontSize: 10, padding: "4px 6px",
                      borderRadius: "0 999px 999px 0",
                      cursor: "pointer", fontFamily: "inherit",
                      flexShrink: 0, lineHeight: 1,
                      transition: "color 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
                  >x</button>
                </div>
              );
            })
          )}
        </div>

        <span style={{ color: "var(--border-subtle)", fontSize: 12, flexShrink: 0 }}>|</span>

        {/* Action buttons */}
        <StripBtn
          onClick={() => { void handlePreview(); }}
          disabled={!hasAtt}
          title={hasAtt ? `Preview ${selectedAtt!.fileName}` : "No attachment"}
        >PREVIEW</StripBtn>

        <StripBtn
          onClick={() => { void handleSendAtt(); }}
          disabled={!hasAtt || !isAlive}
          accent
          title={!hasAtt ? "No attachment" : isAlive ? `Send ${selectedAtt!.fileName} to terminal` : "Start terminal first"}
        >SEND</StripBtn>
        {hasAtt && !isAlive && (
          <span style={{ color: "var(--danger)", fontSize: 10, letterSpacing: 0, whiteSpace: "nowrap", flexShrink: 0 }}>
            start first
          </span>
        )}

        {/* HANDOFF: enabled whenever terminal is alive — targets shown in modal */}
        <StripBtn
          onClick={handleOpenHandoff}
          disabled={!isAlive}
          accent
          title={isAlive ? "Handoff output to another terminal" : "Start terminal first"}
        >HANDOFF</StripBtn>

        {/* ── Auto-forward: FORWARD TO [target] [FORWARD] ── */}
        <span style={{ color: "var(--border-subtle)", fontSize: 12, flexShrink: 0 }}>|</span>
        <span style={{ color: "var(--text-faint)", fontSize: 9, letterSpacing: 0.5, flexShrink: 0, whiteSpace: "nowrap" }}>
          FORWARD TO
        </span>

        {linkedTarget ? (
          <span style={{
            fontSize: 10, color: "var(--text-muted)", flexShrink: 0,
            maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {linkedTarget.label}
          </span>
        ) : otherTerminals.length > 0 ? (
          <select
            value={effectiveFwdTarget?.id ?? ""}
            onChange={(e) => { setSelectedForwardTargetId(e.target.value); setFwdError(""); }}
            style={{
              background: "transparent",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-muted)",
              fontSize: 9, padding: "3px 6px",
              borderRadius: 999, fontFamily: "inherit",
              maxWidth: 90, flexShrink: 1, minWidth: 0,
            }}
          >
            {otherTerminals.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        ) : (
          <span style={{ fontSize: 9, color: "var(--text-faint)", flexShrink: 0 }}>—</span>
        )}

        <StripBtn
          onClick={() => { void handleForwardToNext(); }}
          disabled={!isAlive || !effectiveFwdTarget || !targetIsRunning || forwarding || otherTerminals.length === 0}
          accent={isAlive && !!effectiveFwdTarget && targetIsRunning && !forwarding}
          title={
            !isAlive                                           ? "Start this terminal first" :
            otherTerminals.length === 0 || !effectiveFwdTarget ? "No targets"               :
            !targetIsRunning                                   ? "Start target first"        :
            forwarding                                         ? "Forwarding…"              :
            `Forward to ${effectiveFwdTarget.label}`
          }
        >
          {forwarding ? "…" : "FORWARD"}
        </StripBtn>

        {fwdError && (
          <span style={{ color: "var(--danger)", fontSize: 9, whiteSpace: "nowrap", flexShrink: 0 }}>
            {fwdError}
          </span>
        )}

      </div>

      {/* ── Add-path row (collapsible) ── */}
      {showAddPath && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap",
          padding: "8px 10px",
          background: "var(--surface-0)", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0,
        }}>
          <input
            autoFocus
            value={addInput}
            onChange={(e) => { setAddInput(e.target.value); setAddError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddPath(); if (e.key === "Escape") { setShowAddPath(false); setAddInput(""); setAddError(""); } }}
            placeholder="Paste .md or .txt file path…"
            style={{
              flex: 1, background: "var(--surface-1)",
              border: `1px solid ${addError ? "var(--danger)" : "var(--border-subtle)"}`,
              color: "var(--text-main)", fontSize: 11, padding: "6px 10px",
              borderRadius: 999, fontFamily: "monospace", outline: "none",
              minWidth: 180,
            }}
          />
          {addError && (
            <span style={{ color: "var(--danger)", fontSize: 9, whiteSpace: "nowrap" }}>{addError}</span>
          )}
          <StripBtn onClick={handleAddPath} accent>ADD</StripBtn>
          <StripBtn onClick={() => { setShowAddPath(false); setAddInput(""); setAddError(""); }}>x</StripBtn>
        </div>
      )}

      {/* ── Preview area (collapsible) ── */}
      {showPreviewArea && (
        <div style={{
          background: "var(--surface-0)", borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0, maxHeight: 110, overflowY: "auto", position: "relative",
        }}>
          <button
            onClick={() => setPreview(PREVIEW_IDLE)}
            title="Close preview"
            style={{
              position: "absolute", top: 3, right: 5,
              background: "none", border: "none", color: "var(--text-faint)",
              fontSize: 10, cursor: "pointer", padding: 0, lineHeight: 1,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
          >x</button>

          {preview.loading && (
            <div style={{ padding: "6px 8px", color: "var(--text-muted)", fontSize: 9 }}>Loading…</div>
          )}
          {preview.error && (
            <div style={{ padding: "6px 8px", color: "var(--danger)", fontSize: 9 }}>{preview.error}</div>
          )}
          {preview.content !== null && !preview.loading && (
            <>
              {preview.truncated && (
                <div style={{ padding: "2px 8px", background: "var(--accent-soft)", color: "var(--warning)", fontSize: 8, borderBottom: "1px solid var(--border-subtle)" }}>
                  truncated at 256 KB
                </div>
              )}
              <pre style={{
                margin: 0, padding: "5px 8px", color: "var(--text-main)",
                fontSize: 10, fontFamily: "monospace",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{preview.content}</pre>
            </>
          )}
        </div>
      )}

      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        background: "var(--terminal-bg)",
      }}>
        {isRunning ? (
          <div ref={containerRef} style={{ flex: 1, overflow: "hidden", minHeight: 0 }} />
        ) : (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, minHeight: 0,
          }}>
            <span style={{ color: "var(--text-faint)", fontSize: 12, letterSpacing: 0 }}>Dormant</span>
            <span style={{ color: "var(--text-faint)", fontSize: 10, letterSpacing: 0, opacity: 0.7 }}>
              Start when ready
            </span>
            <button
              onClick={onStart}
              style={{
                marginTop: 4,
                padding: "7px 18px", background: "var(--accent)",
                border: "1px solid transparent", borderRadius: 999,
                color: "var(--app-bg)", fontSize: 12, fontFamily: "inherit",
                fontWeight: 650, letterSpacing: 0, cursor: "pointer", transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >START</button>
          </div>
        )}

        <DinoLane
          dinoId={agent.dinoId}
          state={dinoState}
          animationSpeed={settings?.animationSpeed ?? 1}
          dinoScale={dinoScale}
          visualPhase={dinoVisualPhase}
          onEggHatchComplete={handleEggHatchComplete}
        />
      </div>

      {/* ── Logs overlay ── */}
      {showLogs && (
        <LogsPanel
          label={agent.label}
          lifecycle={lifecycle}
          getLogs={getSessionLogs}
          onClose={() => { setShowLogs(false); focusTerminal(); }}
        />
      )}

      {/* ── Handoff modal ── */}
      {handoffCapture !== null && (
        <HandoffModal
          sourceAgentId={agent.id}
          sourceLabel={agent.label}
          initialCapture={handoffCapture}
          runningTargets={runningTargets}
          onClose={() => setHandoffCapture(null)}
          onSent={(targetId) => onRecordWorkflowLink(agent.id, targetId, "handoff")}
        />
      )}
    </div>
  );
}
