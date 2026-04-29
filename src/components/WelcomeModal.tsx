import { useState } from "react";

interface MissionCard {
  index:   string;
  title:   string;
  lines:   string[];
}

const CARDS: MissionCard[] = [
  {
    index: "01",
    title: "DEPLOY DINO TERMINALS",
    lines: [
      "Create one terminal per AI agent.",
      "Set launch command, working directory, dino identity.",
      "Each dino reflects live process state.",
    ],
  },
  {
    index: "02",
    title: "ATTACH + SEND CONTEXT",
    lines: [
      "Drop .md or .txt skill files onto any terminal.",
      "Preview attachment before sending.",
      "Send file contents directly into the PTY.",
    ],
  },
  {
    index: "03",
    title: "HANDOFF + WORKFLOW MAP",
    lines: [
      "Capture terminal output. Edit. Route to another agent.",
      "Every handoff is recorded as a directional link.",
      "Open WORKFLOW to view the connection map.",
    ],
  },
];

interface Props {
  onDismiss:  (dontShowAgain: boolean) => void;
  onLoadDemo: () => void;
}

export function WelcomeModal({ onDismiss, onLoadDemo }: Props) {
  const [dontShow, setDontShow] = useState(true);

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "var(--overlay-bg)",
        backdropFilter:  "blur(8px)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         400,
      }}
    >
      <div
        style={{
          width:         580,
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
        {/* ── Header ── */}
        <div style={{
          padding:      "14px 18px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          background:   "var(--surface-1)",
          flexShrink:   0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src="/app-icon.png"
              alt=""
              aria-hidden="true"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                display: "block",
              }}
            />
            <span style={{ color: "var(--text-main)", fontWeight: 700, fontSize: 15, letterSpacing: 0 }}>
              CMDino
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 0 }}>
              Mission briefing
            </span>
          </div>
          <div style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 5, letterSpacing: 0 }}>
            Visual command center for multi-agent AI CLI workflows.
          </div>
        </div>

        {/* ── Mission cards ── */}
        <div style={{
          display:  "flex",
          gap:      0,
          flexShrink: 0,
          borderBottom: "1px solid var(--border-subtle)",
        }}>
          {CARDS.map((card, i) => (
            <div
              key={card.index}
              style={{
                flex:         1,
                padding:      "14px 14px 16px",
                borderRight:  i < CARDS.length - 1 ? "1px solid var(--border-subtle)" : "none",
                display:      "flex",
                flexDirection: "column",
                gap:          8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  color:         "var(--text-faint)",
                  fontSize:      18,
                  fontWeight:    700,
                  letterSpacing: 1,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink:    0,
                }}>
                  {card.index}
                </span>
                <span style={{
                  color:         "var(--text-main)",
                  fontSize:      11,
                  fontWeight:    650,
                  letterSpacing: 0,
                  lineHeight:    1.3,
                }}>
                  {card.title}
                </span>
              </div>
              <ul style={{ paddingLeft: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 5 }}>
                {card.lines.map((line, li) => (
                  <li
                    key={li}
                    style={{
                      color:        "var(--text-muted)",
                      fontSize:     11,
                      letterSpacing: 0,
                      lineHeight:   1.5,
                      paddingLeft:  10,
                      borderLeft:   "1px solid var(--border-subtle)",
                    }}
                  >
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div style={{
          display:        "flex",
          alignItems:     "center",
          justifyContent: "space-between",
          padding:        "12px 18px",
          gap:            12,
          flexShrink:     0,
        }}>
          {/* Checkbox */}
          <label style={{
            display:    "flex",
            alignItems: "center",
            gap:        6,
            cursor:     "pointer",
            userSelect: "none",
          }}>
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(e) => setDontShow(e.target.checked)}
              style={{ accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 12, letterSpacing: 0 }}>
              Don't show this again
            </span>
          </label>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { onLoadDemo(); onDismiss(dontShow); }}
              style={{
                background:   "none",
                border:       "1px solid transparent",
                color:        "var(--text-muted)",
                fontSize:     12,
                padding:      "8px 14px",
                borderRadius: 999,
                fontFamily:   "inherit",
                fontWeight:   600,
                letterSpacing: 0,
                cursor:       "pointer",
                transition:   "color 0.12s, border-color 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-main)";
                (e.currentTarget as HTMLButtonElement).style.background = "var(--button-bg)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)";
                (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              }}
            >
              LOAD DEMO
            </button>
            <button
              onClick={() => onDismiss(dontShow)}
              style={{
                background:   "var(--accent)",
                border:       "1px solid transparent",
                color:        "var(--app-bg)",
                fontSize:     12,
                padding:      "8px 16px",
                borderRadius: 999,
                fontFamily:   "inherit",
                fontWeight:   650,
                letterSpacing: 0,
                cursor:       "pointer",
                transition:   "opacity 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
            >
              START EMPTY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
