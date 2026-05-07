import { useState } from "react";

const STEPS = [
  {
    num:   "01",
    title: "Deploy Agents",
    desc:  "One terminal per AI agent. Set command, directory, and dino identity.",
  },
  {
    num:   "02",
    title: "Attach Context",
    desc:  "Drop .md or .txt skill files. Preview, then SEND into the live PTY.",
  },
  {
    num:   "03",
    title: "Handoff Work",
    desc:  "Capture output and route it to another agent. Every link is mapped.",
  },
];

interface Props {
  onDismiss:       (dontShowAgain: boolean) => void;
  onLoadDemo:      () => void;
  onDeployAgent:   () => void;
  onLoadTemplate:  () => void;
}

export function WelcomeModal({ onDismiss, onLoadDemo, onDeployAgent, onLoadTemplate }: Props) {
  const [dontShow, setDontShow] = useState(true);

  return (
    <div className="cmd-modal-overlay" style={{ zIndex: 400 }}>
      <div className="cmd-modal-panel cmd-modal-panel--welcome soft-enter">
        {/* Header */}
        <div className="cmd-modal-header">
          <img
            src="/app-icon.png"
            alt=""
            aria-hidden="true"
            style={{ width: 28, height: 28, borderRadius: 8, display: "block", flexShrink: 0 }}
          />
          <div className="cmd-modal-title-group">
            <span className="cmd-modal-title">Welcome to CMDino</span>
            <span className="cmd-modal-subtitle">Visual command center for multi-agent AI CLI workflows.</span>
          </div>
        </div>

        {/* Steps */}
        <div style={{
          display:      "flex",
          flexShrink:   0,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          {STEPS.map((s, i) => (
            <div
              key={s.num}
              style={{
                flex:          1,
                padding:       "14px 14px 16px",
                borderRight:   i < STEPS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                display:       "flex",
                flexDirection: "column",
                gap:           7,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  color: "var(--text-faint)", fontSize: 17, fontWeight: 700,
                  letterSpacing: 1, fontVariantNumeric: "tabular-nums", flexShrink: 0,
                }}>
                  {s.num}
                </span>
                <span style={{
                  color: "var(--text-main)", fontSize: 11, fontWeight: 650, lineHeight: 1.3,
                }}>
                  {s.title}
                </span>
              </div>
              <p style={{
                color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5,
                paddingLeft: 10, borderLeft: "1px solid var(--border-subtle)",
                margin: 0,
              }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="cmd-modal-footer" style={{ justifyContent: "space-between" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              style={{ accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Don't show this again</span>
          </label>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className="cmd-pill-btn cmd-pill-btn--ghost" style={{ fontSize: 12, padding: "8px 12px" }}
              onClick={() => onDismiss(dontShow)}>
              Start Empty
            </button>
            <button className="cmd-pill-btn" style={{ fontSize: 12, padding: "8px 14px", borderColor: "transparent" }}
              onClick={onLoadTemplate}>
              Templates
            </button>
            <button className="cmd-pill-btn" style={{ fontSize: 12, padding: "8px 14px", borderColor: "transparent" }}
              onClick={() => { onLoadDemo(); onDismiss(dontShow); }}>
              Load Demo Workflow
            </button>
            <button className="cmd-pill-btn cmd-pill-btn--primary"
              onClick={() => { onDeployAgent(); onDismiss(dontShow); }}>
              Deploy First Agent
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
