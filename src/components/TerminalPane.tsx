import { useState, useRef, useEffect, useCallback } from "react";
import { DinoLane, type DinoVisualPhase } from "../dino/DinoLane";
import { LogsPanel }       from "./LogsPanel";
import { HandoffModal }    from "./HandoffModal";
import type { TerminalAgent }   from "../domain/terminalAgent";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import { fileBridge }      from "../orchestration/fileBridge";
import type { WorkflowLinkKind } from "../domain/workflow";
import type { AppSettings } from "../domain/appSettings";
import type { TerminalViewMode } from "../domain/viewMode";
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
  settings?:            AppSettings;
  viewMode:             TerminalViewMode;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalPane({
  agent, onRemove, isRunning, onStart,
  allAgents, runningAgentIds, onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink,
  settings,
  viewMode,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dinoState, lifecycle,
    copyVisible, restart, kill,
    getSessionLogs, focusTerminal,
    sendInput, captureSelectedOrLastLines,
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
        display: "flex", alignItems: "center", gap: 7,
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
          minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {agent.label}
        </span>
        <span style={{ flex: 1, minWidth: 0 }} />
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
        <HdrBtn title="Close terminal" onClick={() => { void handleRemove(); }} danger>✕</HdrBtn>
      </div>

      {/* ── Orchestration strip ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
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
          display: "flex", gap: 4, flex: 1,
          overflowX: "auto", alignItems: "center", minWidth: 0,
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
                  >{att.fileName}</button>
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

      </div>

      {/* ── Add-path row (collapsible) ── */}
      {showAddPath && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
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
