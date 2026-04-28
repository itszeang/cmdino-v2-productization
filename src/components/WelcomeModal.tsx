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
        background:     "rgba(0,0,0,0.82)",
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
          background:    "#090d12",
          border:        "1px solid #0e2233",
          borderRadius:  8,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     "0 0 80px rgba(0,200,255,0.07)",
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding:      "14px 18px 12px",
          borderBottom: "1px solid #0e2233",
          background:   "#0b0f14",
          flexShrink:   0,
        }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ color: "#00c8ff", fontWeight: 700, fontSize: 13, letterSpacing: 2.5 }}>
              CMDino
            </span>
            <span style={{ color: "#1a3a4a", fontSize: 10, letterSpacing: 1 }}>
              MISSION BRIEFING
            </span>
          </div>
          <div style={{ color: "#334455", fontSize: 9, marginTop: 4, letterSpacing: 0.8 }}>
            Visual command center for multi-agent AI CLI workflows.
          </div>
        </div>

        {/* ── Mission cards ── */}
        <div style={{
          display:  "flex",
          gap:      0,
          flexShrink: 0,
          borderBottom: "1px solid #0e2233",
        }}>
          {CARDS.map((card, i) => (
            <div
              key={card.index}
              style={{
                flex:         1,
                padding:      "14px 14px 16px",
                borderRight:  i < CARDS.length - 1 ? "1px solid #0e2233" : "none",
                display:      "flex",
                flexDirection: "column",
                gap:          8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  color:         "#00c8ff33",
                  fontSize:      18,
                  fontWeight:    700,
                  letterSpacing: 1,
                  fontVariantNumeric: "tabular-nums",
                  flexShrink:    0,
                }}>
                  {card.index}
                </span>
                <span style={{
                  color:         "#4a7a9a",
                  fontSize:      9,
                  fontWeight:    700,
                  letterSpacing: 1.2,
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
                      color:        "#3a5a6a",
                      fontSize:     9,
                      letterSpacing: 0.3,
                      lineHeight:   1.5,
                      paddingLeft:  10,
                      borderLeft:   "1px solid #0e2233",
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
              style={{ accentColor: "#00c8ff", cursor: "pointer" }}
            />
            <span style={{ color: "#334455", fontSize: 9, letterSpacing: 0.6 }}>
              Don't show this again
            </span>
          </label>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => { onLoadDemo(); onDismiss(dontShow); }}
              style={{
                background:   "none",
                border:       "1px solid #1a3a4a",
                color:        "#334455",
                fontSize:     10,
                padding:      "5px 12px",
                borderRadius: 4,
                fontFamily:   "inherit",
                fontWeight:   700,
                letterSpacing: 0.8,
                cursor:       "pointer",
                transition:   "color 0.12s, border-color 0.12s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#7dd3fc";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#00c8ff44";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#334455";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a3a4a";
              }}
            >
              LOAD DEMO
            </button>
            <button
              onClick={() => onDismiss(dontShow)}
              style={{
                background:   "#00c8ff0f",
                border:       "1px solid #00c8ff44",
                color:        "#00c8ff",
                fontSize:     10,
                padding:      "5px 16px",
                borderRadius: 4,
                fontFamily:   "inherit",
                fontWeight:   700,
                letterSpacing: 0.8,
                cursor:       "pointer",
                transition:   "background 0.12s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f"; }}
            >
              START EMPTY
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
