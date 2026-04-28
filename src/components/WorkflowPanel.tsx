import type { TerminalAgent } from "../domain/terminalAgent";
import type { WorkflowLink }  from "../domain/workflow";

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W  = 158;
const NODE_H  = 92;
const PANEL_W = 860;
const PANEL_H = 560;
const CX      = PANEL_W / 2;
const CY      = (PANEL_H - 40) / 2 + 20; // offset for header

const LC_COLORS: Record<string, string> = {
  dormant:  "#1e3a4a",
  spawning: "#facc15",
  running:  "#00c8ff",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#f87171",
};

function lcColor(lc: string) { return LC_COLORS[lc] ?? "#1e3a4a"; }

function dinoIdleSprite(dinoId: string): string {
  const p = dinoId.split("-");
  if (p.length < 2) return "";
  return `/${p[0]}/${p.slice(1).join("-")}/base/idle.png`;
}

// ── Layout helpers ────────────────────────────────────────────────────────────

interface NodePos { x: number; y: number; }

function computePositions(n: number): NodePos[] {
  if (n === 0) return [];
  if (n === 1) return [{ x: CX - NODE_W / 2, y: CY - NODE_H / 2 }];
  if (n === 2) return [
    { x: CX - NODE_W - 40, y: CY - NODE_H / 2 },
    { x: CX + 40,          y: CY - NODE_H / 2 },
  ];
  const r = Math.min(CX - NODE_W / 2 - 30, CY - NODE_H / 2 - 30, 210);
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n - Math.PI / 2;
    return {
      x: CX + r * Math.cos(angle) - NODE_W / 2,
      y: CY + r * Math.sin(angle) - NODE_H / 2,
    };
  });
}

function edgePoints(
  sx: number, sy: number, tx: number, ty: number,
): { x1: number; y1: number; x2: number; y2: number; mx: number; my: number } {
  const scx = sx + NODE_W / 2;
  const scy = sy + NODE_H / 2;
  const tcx = tx + NODE_W / 2;
  const tcy = ty + NODE_H / 2;
  const dx  = tcx - scx;
  const dy  = tcy - scy;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux  = dx / len;
  const uy  = dy / len;
  const startOff = 72;
  const endOff   = 80;
  return {
    x1: scx + ux * startOff,
    y1: scy + uy * startOff,
    x2: tcx - ux * endOff,
    y2: tcy - uy * endOff,
    mx: (scx + tcx) / 2,
    my: (scy + tcy) / 2,
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  agents:             TerminalAgent[];
  workflowLinks:      WorkflowLink[];
  lifecycleByAgentId: Record<string, string>;
  onRemoveLink:       (id: string) => void;
  onClose:            () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowPanel({
  agents, workflowLinks, lifecycleByAgentId, onRemoveLink, onClose,
}: Props) {
  const positions  = computePositions(agents.length);
  const posMap     = new Map(agents.map((a, i) => [a.configId, positions[i]]));

  // Only draw links where both ends exist
  const drawLinks = workflowLinks.filter(
    (l) => posMap.has(l.sourceConfigId) && posMap.has(l.targetConfigId),
  );

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.78)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         200,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width:          PANEL_W,
          maxWidth:       "96vw",
          height:         PANEL_H,
          maxHeight:      "90vh",
          background:     "#090d12",
          border:         "1px solid #0e2233",
          borderRadius:   10,
          overflow:       "hidden",
          display:        "flex",
          flexDirection:  "column",
          boxShadow:      "0 0 80px rgba(0,200,255,0.07)",
          position:       "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           10,
          padding:       "9px 14px",
          borderBottom:  "1px solid #0e2233",
          flexShrink:    0,
          background:    "#0b0f14",
        }}>
          <span style={{ color: "#00c8ff", fontWeight: 700, fontSize: 11, letterSpacing: 2 }}>
            WORKFLOW VIEW
          </span>
          <span style={{ color: "#1a3a4a", fontSize: 10 }}>
            {agents.length} terminal{agents.length !== 1 ? "s" : ""}
            {drawLinks.length > 0 ? ` · ${drawLinks.length} link${drawLinks.length !== 1 ? "s" : ""}` : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft:   "auto",
              background:   "none",
              border:       "none",
              color:        "#2a3a4a",
              fontSize:     15,
              cursor:       "pointer",
              padding:      "0 2px",
              lineHeight:   1,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a"; }}
          >✕</button>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>

          {/* Empty states */}
          {agents.length === 0 && (
            <div style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          "#1a3a4a",
              fontSize:       12,
              letterSpacing:  1,
            }}>
              No Dino terminals
            </div>
          )}
          {agents.length > 0 && drawLinks.length === 0 && (
            <div style={{
              position:  "absolute",
              bottom:    14,
              left:      0,
              right:     0,
              textAlign: "center",
              color:     "#162a38",
              fontSize:  9,
              letterSpacing: 0.8,
            }}>
              No manual handoffs recorded yet — send a handoff to create a link
            </div>
          )}

          {/* ── SVG edges ── */}
          <svg
            style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
            width="100%" height="100%"
          >
            <defs>
              <marker
                id="wf-arrow"
                viewBox="0 0 10 10"
                refX="9" refY="5"
                markerWidth="5" markerHeight="5"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#00c8ff55" />
              </marker>
            </defs>

            {drawLinks.map((link) => {
              const sp = posMap.get(link.sourceConfigId)!;
              const tp = posMap.get(link.targetConfigId)!;
              const { x1, y1, x2, y2, mx, my } = edgePoints(sp.x, sp.y, tp.x, tp.y);
              const sw = Math.min(1 + link.count, 5);
              const label =
                (link.kind === "handoff" ? "handoff" : "skill send") +
                (link.count > 1 ? ` ×${link.count}` : "");

              return (
                <g key={link.id}>
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    stroke="#00c8ff44"
                    strokeWidth={sw}
                    markerEnd="url(#wf-arrow)"
                  />
                  {/* Edge label + remove — uses foreignObject for HTML button */}
                  <foreignObject
                    x={mx - 46}
                    y={my - 11}
                    width={92}
                    height={22}
                    style={{ pointerEvents: "all" }}
                  >
                    <div
                      style={{
                        display:        "flex",
                        alignItems:     "center",
                        justifyContent: "center",
                        gap:            4,
                        background:     "#09131a",
                        border:         "1px solid #0e2030",
                        borderRadius:   3,
                        padding:        "1px 4px",
                        whiteSpace:     "nowrap",
                      }}
                    >
                      <span style={{ color: "#3a6a8a", fontSize: 8, letterSpacing: 0.5 }}>
                        {label}
                      </span>
                      <button
                        onClick={() => onRemoveLink(link.id)}
                        style={{
                          background:   "none",
                          border:       "none",
                          color:        "#1a3040",
                          fontSize:     9,
                          cursor:       "pointer",
                          padding:      0,
                          lineHeight:   1,
                          flexShrink:   0,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1a3040"; }}
                      >×</button>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* ── Node cards ── */}
          {agents.map((agent, i) => {
            const pos  = positions[i];
            const lc   = lifecycleByAgentId[agent.id] ?? "dormant";
            const kind = agent.agentKind ?? "custom";
            const sprite = dinoIdleSprite(agent.dinoId);

            return (
              <div
                key={agent.id}
                style={{
                  position:      "absolute",
                  left:          pos.x,
                  top:           pos.y,
                  width:         NODE_W,
                  height:        NODE_H,
                  background:    "#0d1520",
                  border:        `1px solid ${lc === "running" ? "#00c8ff22" : "#0e2030"}`,
                  borderRadius:  6,
                  display:       "flex",
                  alignItems:    "center",
                  gap:           8,
                  padding:       "8px 10px",
                  boxShadow:     lc === "running" ? "0 0 20px rgba(0,200,255,0.05)" : "none",
                }}
              >
                {/* Dino avatar */}
                {sprite && (
                  <div
                    style={{
                      width:               44,
                      height:              44,
                      backgroundImage:     `url("${sprite}")`,
                      backgroundSize:      "132px 44px",
                      backgroundPosition:  "0 0",
                      backgroundRepeat:    "no-repeat",
                      imageRendering:      "pixelated",
                      flexShrink:          0,
                      opacity:             lc === "dormant" || lc === "killed" || lc === "exited" ? 0.35 : 0.85,
                    }}
                  />
                )}

                {/* Text info */}
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span style={{
                    color:         "#7dd3fc",
                    fontSize:      10,
                    fontWeight:    700,
                    letterSpacing: 0.4,
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                    whiteSpace:    "nowrap",
                  }}>
                    {agent.label}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{
                      color:         "#1e4a5a",
                      fontSize:      8,
                      letterSpacing: 0.6,
                      background:    "#0a1a24",
                      padding:       "0 3px",
                      borderRadius:  2,
                    }}>
                      {kind}
                    </span>
                    <span style={{
                      color:         lcColor(lc),
                      fontSize:      8,
                      letterSpacing: 0.8,
                      fontWeight:    600,
                    }}>
                      {lc.toUpperCase()}
                    </span>
                  </div>
                  <span style={{
                    color:         "#162a38",
                    fontSize:      8,
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                    whiteSpace:    "nowrap",
                  }}>
                    {agent.dinoId}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
