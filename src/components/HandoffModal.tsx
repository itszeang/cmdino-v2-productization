import { useState } from "react";
import { terminalBridge } from "../terminal/terminalBridge";
import type { TerminalAgent } from "../domain/terminalAgent";

interface Props {
  sourceAgentId:  string;
  sourceLabel:    string;
  initialCapture: string;
  runningTargets: TerminalAgent[];
  onClose:        () => void;
  onSent?:        (targetAgentId: string) => void;
}

export function HandoffModal({ sourceAgentId, sourceLabel, initialCapture, runningTargets, onClose, onSent }: Props) {
  const [targetId,  setTargetId]  = useState(runningTargets[0]?.id ?? "");
  const [text,      setText]      = useState(initialCapture);
  const [sending,   setSending]   = useState(false);
  const [sendError, setSendError] = useState("");

  async function handleSend() {
    if (!targetId || !text.trim()) return;
    setSending(true);
    setSendError("");
    try {
      await terminalBridge.write(targetId, text);
      onSent?.(targetId);
      setSending(false);
      onClose();
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
      setSending(false);
    }
  }

  const noTargets = runningTargets.length === 0;

  return (
    <div
      style={{
        position:   "fixed",
        inset:      0,
        background: "var(--overlay-bg)",
        backdropFilter: "blur(8px)",
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex:     100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background:   "var(--surface-1)",
          border:       "1px solid var(--border-subtle)",
          borderRadius: 12,
          width:        560,
          maxWidth:     "94vw",
          maxHeight:    "86vh",
          display:      "flex",
          flexDirection: "column",
          overflow:     "hidden",
          boxShadow:    "var(--shadow-panel)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 650 }}>Handoff</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>from {sourceLabel}</span>
          <span style={{ color: "var(--text-faint)", fontSize: 11 }}>({sourceAgentId.slice(0, 8)})</span>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 14, cursor: "pointer", padding: "4px 7px", borderRadius: 999 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--button-bg)"; e.currentTarget.style.color = "var(--text-main)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; }}
          >x</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>Target</span>
          {noTargets ? (
            <span style={{ color: "var(--danger)", fontSize: 12 }}>No running terminals available as target.</span>
          ) : (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{
                background:   "var(--input-bg)",
                border:       "1px solid var(--border-subtle)",
                color:        "var(--text-main)",
                fontSize:     12,
                padding:      "7px 10px",
                borderRadius: 999,
                fontFamily:   "inherit",
                flex:         1,
              }}
            >
              {runningTargets.map((a) => (
                <option key={a.id} value={a.id}>{a.label}</option>
              ))}
            </select>
          )}
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "14px 16px", gap: 8, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>Captured output</span>
            <span style={{ color: "var(--text-faint)", fontSize: 11 }}>edit before sending</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex:        1,
              background:  "var(--terminal-bg)",
              border:      "1px solid var(--border-subtle)",
              color:       "#e5e5e5",
              fontSize:    11,
              fontFamily:  "Cascadia Code, JetBrains Mono, Consolas, monospace",
              padding:     "10px",
              borderRadius: 12,
              resize:      "none",
              outline:     "none",
              minHeight:   120,
            }}
          />
          {sendError && (
            <div style={{ color: "var(--danger)", fontSize: 12 }}>{sendError}</div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "12px 16px", borderTop: "1px solid var(--border-subtle)", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background:   "transparent",
              border:       "1px solid transparent",
              color:        "var(--text-muted)",
              fontSize:     12,
              padding:      "8px 14px",
              borderRadius: 999,
              fontFamily:   "inherit",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >Cancel</button>
          <button
            onClick={() => void handleSend()}
            disabled={noTargets || !text.trim() || sending}
            style={{
              background:   noTargets || !text.trim() ? "var(--button-bg)" : "var(--accent)",
              border:       "1px solid transparent",
              color:        noTargets || !text.trim() ? "var(--text-faint)" : "var(--app-bg)",
              fontSize:     12,
              padding:      "8px 16px",
              borderRadius: 999,
              fontFamily:   "inherit",
              fontWeight:   650,
              cursor:       noTargets || !text.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "Sending..." : "Send to target"}
          </button>
        </div>
      </div>
    </div>
  );
}
