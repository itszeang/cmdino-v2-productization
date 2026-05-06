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
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "var(--overlay-bg)",
        backdropFilter: "blur(8px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         400,
      }}
    >
      <div
        style={{
          width:         560,
          maxWidth:      "96vw",
          maxHeight:     "90vh",
          background:    "var(--surface-1)",
          border:        "1px solid var(--border-subtle)",
          borderRadius:  12,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     "var(--shadow-panel)",
        }}
      >
        {/* Header */}
        <div style={{
          padding:      "14px 18px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink:   0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/app-icon.png"
              alt=""
              aria-hidden="true"
              style={{ width: 28, height: 28, borderRadius: 8, display: "block" }}
            />
            <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: 15 }}>
              Welcome to CMDino
            </span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 5 }}>
            Visual command center for multi-agent AI CLI workflows.
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
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "12px 18px",
          gap:            12,
          flexShrink:     0,
          flexWrap:       "wrap",
          rowGap:         10,
        }}>
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
            {/* Tertiary: start empty */}
            <button
              onClick={() => onDismiss(dontShow)}
              style={{
                background: "none", border: "1px solid transparent",
                color: "var(--text-faint)", fontSize: 12, padding: "8px 12px",
                borderRadius: 999, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-muted)";
                b.style.background = "var(--button-bg)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-faint)";
                b.style.background = "none";
              }}
            >
              Start Empty
            </button>

            {/* Secondary: templates */}
            <button
              onClick={onLoadTemplate}
              style={{
                background: "none", border: "1px solid transparent",
                color: "var(--text-muted)", fontSize: 12, padding: "8px 14px",
                borderRadius: 999, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-main)";
                b.style.background = "var(--button-bg)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-muted)";
                b.style.background = "none";
              }}
            >
              Templates
            </button>

            {/* Secondary: demo */}
            <button
              onClick={() => { onLoadDemo(); onDismiss(dontShow); }}
              style={{
                background: "none", border: "1px solid transparent",
                color: "var(--text-muted)", fontSize: 12, padding: "8px 14px",
                borderRadius: 999, fontFamily: "inherit", fontWeight: 600, cursor: "pointer",
              }}
              onMouseEnter={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-main)";
                b.style.background = "var(--button-bg)";
              }}
              onMouseLeave={(e) => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.color = "var(--text-muted)";
                b.style.background = "none";
              }}
            >
              Load Demo Workflow
            </button>

            {/* Primary: deploy */}
            <button
              onClick={() => { onDeployAgent(); onDismiss(dontShow); }}
              style={{
                background: "var(--accent)", border: "1px solid transparent",
                color: "var(--app-bg)", fontSize: 12, padding: "8px 16px",
                borderRadius: 999, fontFamily: "inherit", fontWeight: 650, cursor: "pointer",
                transition: "opacity 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              Deploy First Agent
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
