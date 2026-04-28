import { useState } from "react";
import { terminalBridge } from "../terminal/terminalBridge";
import type { TerminalAgent } from "../domain/terminalAgent";

interface Props {
  sourceAgentId: string;
  sourceLabel:   string;
  initialCapture: string;
  runningTargets: TerminalAgent[]; // agents that can receive (running, not source)
  onClose:        () => void;
}

export function HandoffModal({ sourceAgentId, sourceLabel, initialCapture, runningTargets, onClose }: Props) {
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
    } catch (err) {
      setSendError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
      if (!sendError) onClose();
    }
  }

  const noTargets = runningTargets.length === 0;

  return (
    <div
      style={{
        position:   "fixed",
        inset:      0,
        background: "#00000099",
        display:    "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex:     100,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background:   "#0b0f14",
          border:       "1px solid #0e2233",
          borderRadius: 8,
          width:        560,
          maxWidth:     "94vw",
          maxHeight:    "86vh",
          display:      "flex",
          flexDirection: "column",
          overflow:     "hidden",
          boxShadow:    "0 0 48px rgba(0,200,255,0.08)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #0e2233", flexShrink: 0 }}>
          <span style={{ color: "#00c8ff", fontSize: 11, fontWeight: 700, letterSpacing: 1.5 }}>HANDOFF</span>
          <span style={{ color: "#1e3a4a", fontSize: 10 }}>SOURCE:</span>
          <span style={{ color: "#7dd3fc", fontSize: 11, fontWeight: 600 }}>{sourceLabel}</span>
          <span style={{ color: "#1e3a4a", fontSize: 10, marginLeft: 4 }}>({sourceAgentId.slice(0, 8)})</span>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", background: "none", border: "none", color: "#2a3a4a", fontSize: 14, cursor: "pointer", padding: "0 2px" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a"; }}
          >✕</button>
        </div>

        {/* Target selector */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid #0e2233", flexShrink: 0 }}>
          <span style={{ color: "#4a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>TARGET</span>
          {noTargets ? (
            <span style={{ color: "#f87171", fontSize: 10 }}>No running terminals available as target.</span>
          ) : (
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              style={{
                background:   "#0d1520",
                border:       "1px solid #1a3a4a",
                color:        "#7dd3fc",
                fontSize:     10,
                padding:      "3px 6px",
                borderRadius: 3,
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

        {/* Text area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 14px", gap: 6, minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#4a7a9a", fontSize: 10, fontWeight: 700, letterSpacing: 1 }}>CAPTURED OUTPUT</span>
            <span style={{ color: "#1a3a4a", fontSize: 9 }}>edit before sending</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{
              flex:        1,
              background:  "#070b0e",
              border:      "1px solid #0e2233",
              color:       "#c8d8e8",
              fontSize:    11,
              fontFamily:  "monospace",
              padding:     "8px",
              borderRadius: 3,
              resize:      "none",
              outline:     "none",
              minHeight:   120,
            }}
          />
          {sendError && (
            <div style={{ color: "#f87171", fontSize: 10 }}>{sendError}</div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid #0e2233", flexShrink: 0 }}>
          <button
            onClick={onClose}
            style={{
              background:   "none",
              border:       "1px solid #1a3a4a",
              color:        "#4a7a9a",
              fontSize:     11,
              padding:      "5px 14px",
              borderRadius: 4,
              fontFamily:   "inherit",
              fontWeight:   700,
              cursor:       "pointer",
            }}
          >CANCEL</button>
          <button
            onClick={() => void handleSend()}
            disabled={noTargets || !text.trim() || sending}
            style={{
              background:   noTargets || !text.trim() ? "transparent" : "#00c8ff0f",
              border:       `1px solid ${noTargets || !text.trim() ? "#1a3a4a" : "#00c8ff44"}`,
              color:        noTargets || !text.trim() ? "#1a3a4a" : "#00c8ff",
              fontSize:     11,
              padding:      "5px 14px",
              borderRadius: 4,
              fontFamily:   "inherit",
              fontWeight:   700,
              cursor:       noTargets || !text.trim() ? "not-allowed" : "pointer",
            }}
          >
            {sending ? "SENDING…" : "⇒ SEND TO TARGET"}
          </button>
        </div>
      </div>
    </div>
  );
}
