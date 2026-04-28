import { useState, useRef, useEffect } from "react";
import { DinoLane }        from "../dino/DinoLane";
import { LogsPanel }       from "./LogsPanel";
import { HandoffModal }    from "./HandoffModal";
import type { TerminalAgent }   from "../domain/terminalAgent";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import { fileBridge }      from "../orchestration/fileBridge";
import type { WorkflowLinkKind } from "../domain/workflow";
import {
  useTerminalProcess,
  type TerminalLifecycleState,
} from "../terminal/useTerminalProcess";

// ── Colour maps ───────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
  patrol_running:   "#00c8ff",
  heavy_processing: "#a855f7",
  review_scan:      "#facc15",
  success_signal:   "#22c55e",
  handoff_signal:   "#22c55e",
  terminal_error:   "#f87171",
  terminal_dead:    "#6b7280",
  idle_center:      "#1e3a4a",
};

const LIFECYCLE_COLORS: Record<TerminalLifecycleState, string> = {
  dormant:  "#1e3a4a",
  spawning: "#facc15",
  running:  "#00c8ff",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#f87171",
};

function dotColor(s: string) { return STATE_COLORS[s] ?? "#1e3a4a"; }
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
      style={{ background: "none", border: "none", color: "#2a3a4a", fontSize: 12,
        lineHeight: 1, cursor: "pointer", padding: "2px 5px", borderRadius: 3,
        fontFamily: "inherit", transition: "color 0.12s", flexShrink: 0 }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = danger ? "#f87171" : "#7dd3fc"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a"; }}
    >{children}</button>
  );
}

function StripBtn({
  onClick, disabled = false, accent = false, title, children,
}: {
  onClick: () => void; disabled?: boolean; accent?: boolean;
  title?: string; children: React.ReactNode;
}) {
  const base  = accent ? "#00c8ff" : "#3a6a8a";
  const bdBase = accent ? "#00c8ff33" : "#162a3a";
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        background: "none",
        border: `1px solid ${disabled ? "#0d1a22" : bdBase}`,
        color: disabled ? "#1a3040" : base,
        fontSize: 9, padding: "1px 6px", borderRadius: 2,
        fontFamily: "inherit", fontWeight: 700, letterSpacing: 0.8,
        cursor: disabled ? "not-allowed" : "pointer",
        flexShrink: 0, whiteSpace: "nowrap", transition: "color 0.1s, border-color 0.1s",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = "#7dd3fc";
        b.style.borderColor = "#00c8ff55";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = disabled ? "#1a3040" : base;
        b.style.borderColor = disabled ? "#0d1a22" : bdBase;
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TerminalPane({
  agent, onRemove, isRunning, onStart,
  allAgents, runningAgentIds, onAddAttachment, onRemoveAttachment,
  onLifecycleChange, onRecordWorkflowLink,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    dinoState, lifecycle,
    copyVisible, restart, kill,
    getSessionLogs, focusTerminal,
    sendInput, captureSelectedOrLastLines,
  } = useTerminalProcess({
    agentId: agent.id, containerRef,
    cwd: agent.cwd, launchCommand: agent.launchCommand,
    agentKind: agent.agentKind, enabled: isRunning,
  });

  // Report lifecycle changes upward for WorkflowPanel display
  useEffect(() => {
    onLifecycleChange(agent.id, lifecycle);
  }, [agent.id, lifecycle, onLifecycleChange]);

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
      background: "#0b0f14", border: "1px solid #0e2233",
      borderRadius: 6, overflow: "hidden", height: "100%",
      boxShadow: "0 0 32px rgba(0,200,255,0.05)", position: "relative",
    }}>

      {/* ── Header — lifecycle only ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 8px 5px 12px",
        background: "#0d1520", borderBottom: "1px solid #0e2233", flexShrink: 0,
      }}>
        <div
          className={pulse ? "status-dot-pulse" : undefined}
          style={{
            width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
            boxShadow: dinoState !== "terminal_dead" && dinoState !== "idle_center"
              ? `0 0 8px ${color}, 0 0 16px ${color}40` : "none",
            transition: "background 0.25s, box-shadow 0.25s",
          }}
        />
        <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
          {agent.label}
        </span>
        <span style={{
          marginLeft: "auto", color: lcColor,
          fontSize: 10, letterSpacing: 1.5, fontWeight: 600,
          transition: "color 0.25s", flexShrink: 0,
        }}>
          {lcLabel(lifecycle)}
        </span>
        <HdrBtn title="Copy visible output" onClick={() => { void copyVisible(); }}>⎘</HdrBtn>
        <HdrBtn title="View session logs" onClick={() => setShowLogs(true)}
          onMouseDown={(e) => e.preventDefault()}>≡</HdrBtn>
        <HdrBtn title="Restart terminal" onClick={() => { void handleRestart(); }}>↺</HdrBtn>
        <HdrBtn title="Close terminal" onClick={() => { void handleRemove(); }} danger>✕</HdrBtn>
      </div>

      {/* ── Orchestration strip ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "3px 8px",
        background: "#090d12", borderBottom: "1px solid #0c1a24",
        flexShrink: 0, minHeight: 24,
      }}>
        {/* Attach skill button */}
        <StripBtn onClick={() => { setShowAddPath((v) => !v); setAddError(""); }} title="Attach a .md or .txt skill file">
          + ATTACH
        </StripBtn>

        <span style={{ color: "#0d1e2a", fontSize: 11, flexShrink: 0 }}>│</span>

        {/* Attachment chips */}
        <div style={{
          display: "flex", gap: 4, flex: 1,
          overflowX: "auto", alignItems: "center", minWidth: 0,
        }}>
          {atts.length === 0 ? (
            <span style={{ color: "#1a3040", fontSize: 9, letterSpacing: 0.6, whiteSpace: "nowrap" }}>
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
                      background: active ? "#00c8ff14" : "none",
                      border: `1px solid ${active ? "#00c8ff44" : "#162a3a"}`,
                      borderRight: "none",
                      color: active ? "#7dd3fc" : "#3a6a8a",
                      fontSize: 9, padding: "1px 5px",
                      borderRadius: "2px 0 0 2px",
                      cursor: "pointer", fontFamily: "inherit",
                      letterSpacing: 0.4, flexShrink: 0,
                      transition: "background 0.1s, border-color 0.1s, color 0.1s",
                    }}
                  >{att.fileName}</button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveAttachment(att.id); if (selectedAttId === att.id) { setSelectedAttId(null); setPreview(PREVIEW_IDLE); } }}
                    title="Remove attachment"
                    style={{
                      background: active ? "#00c8ff14" : "none",
                      border: `1px solid ${active ? "#00c8ff44" : "#162a3a"}`,
                      color: "#1a3040",
                      fontSize: 8, padding: "1px 3px",
                      borderRadius: "0 2px 2px 0",
                      cursor: "pointer", fontFamily: "inherit",
                      flexShrink: 0, lineHeight: 1,
                      transition: "color 0.1s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1a3040"; }}
                  >×</button>
                </div>
              );
            })
          )}
        </div>

        <span style={{ color: "#0d1e2a", fontSize: 11, flexShrink: 0 }}>│</span>

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
          <span style={{ color: "#f8717188", fontSize: 8, letterSpacing: 0.5, whiteSpace: "nowrap", flexShrink: 0 }}>
            start first
          </span>
        )}

        {/* HANDOFF: enabled whenever terminal is alive — targets shown in modal */}
        <StripBtn
          onClick={handleOpenHandoff}
          disabled={!isAlive}
          accent
          title={isAlive ? "Handoff output to another terminal" : "Start terminal first"}
        >HANDOFF ⇒</StripBtn>

        {/* ── Debug hint — remove after confirming buttons work ── */}
        <span style={{ color: "#162a3a", fontSize: 8, letterSpacing: 0.3, whiteSpace: "nowrap", flexShrink: 0 }}>
          [{atts.length}att·{isAlive ? "alive" : lifecycle}]
        </span>
      </div>

      {/* ── Add-path row (collapsible) ── */}
      {showAddPath && (
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px",
          background: "#07090e", borderBottom: "1px solid #0c1a24", flexShrink: 0,
        }}>
          <input
            autoFocus
            value={addInput}
            onChange={(e) => { setAddInput(e.target.value); setAddError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleAddPath(); if (e.key === "Escape") { setShowAddPath(false); setAddInput(""); setAddError(""); } }}
            placeholder="Paste .md or .txt file path…"
            style={{
              flex: 1, background: "#0d1520",
              border: `1px solid ${addError ? "#f8717155" : "#162a3a"}`,
              color: "#c8d8e8", fontSize: 10, padding: "2px 6px",
              borderRadius: 2, fontFamily: "monospace", outline: "none",
            }}
          />
          {addError && (
            <span style={{ color: "#f87171", fontSize: 9, whiteSpace: "nowrap" }}>{addError}</span>
          )}
          <StripBtn onClick={handleAddPath} accent>ADD</StripBtn>
          <StripBtn onClick={() => { setShowAddPath(false); setAddInput(""); setAddError(""); }}>✕</StripBtn>
        </div>
      )}

      {/* ── Preview area (collapsible) ── */}
      {showPreviewArea && (
        <div style={{
          background: "#070b0e", borderBottom: "1px solid #0c1a24",
          flexShrink: 0, maxHeight: 110, overflowY: "auto", position: "relative",
        }}>
          <button
            onClick={() => setPreview(PREVIEW_IDLE)}
            title="Close preview"
            style={{
              position: "absolute", top: 3, right: 5,
              background: "none", border: "none", color: "#1a3040",
              fontSize: 10, cursor: "pointer", padding: 0, lineHeight: 1,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1a3040"; }}
          >✕</button>

          {preview.loading && (
            <div style={{ padding: "6px 8px", color: "#3a6a8a", fontSize: 9 }}>Loading…</div>
          )}
          {preview.error && (
            <div style={{ padding: "6px 8px", color: "#f87171", fontSize: 9 }}>{preview.error}</div>
          )}
          {preview.content !== null && !preview.loading && (
            <>
              {preview.truncated && (
                <div style={{ padding: "2px 8px", background: "#1a250a", color: "#facc15", fontSize: 8, borderBottom: "1px solid #0c1a24" }}>
                  truncated at 256 KB
                </div>
              )}
              <pre style={{
                margin: 0, padding: "5px 8px", color: "#c8d8e8",
                fontSize: 10, fontFamily: "monospace",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>{preview.content}</pre>
            </>
          )}
        </div>
      )}

      {/* ── Terminal area ── */}
      {isRunning ? (
        <div ref={containerRef} style={{ flex: 1, overflow: "hidden", background: "#070b0e", minHeight: 0 }} />
      ) : (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "#070b0e", gap: 12, minHeight: 0,
        }}>
          <span style={{ color: "#1a3a4a", fontSize: 10, letterSpacing: 2 }}>DORMANT</span>
          <button
            onClick={onStart}
            style={{
              padding: "6px 20px", background: "#00c8ff0f",
              border: "1px solid #00c8ff44", borderRadius: 4,
              color: "#00c8ff", fontSize: 11, fontFamily: "inherit",
              fontWeight: 700, letterSpacing: 1, cursor: "pointer", transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f"; }}
          >▶ START</button>
        </div>
      )}

      {/* ── DinoLane ── */}
      <DinoLane dinoId={agent.dinoId} state={dinoState} />

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
