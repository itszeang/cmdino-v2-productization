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
  dormant:  "#737373",
  spawning: "#fbbf24",
  running:  "#e5e5e5",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#fca5a5",
};

function lcColor(lc: string) { return LC_COLORS[lc] ?? "#737373"; }

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
        background:     "var(--overlay-bg)",
        backdropFilter:  "blur(8px)",
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
          background:     "var(--surface-1)",
          border:         "1px solid var(--border-subtle)",
          borderRadius:   12,
          overflow:       "hidden",
          display:        "flex",
          flexDirection:  "column",
          boxShadow:      "var(--shadow-panel)",
          position:       "relative",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display:       "flex",
          alignItems:    "center",
          gap:           10,
          padding:       "14px 16px",
          borderBottom:  "1px solid var(--border-subtle)",
          flexShrink:    0,
          background:    "var(--surface-1)",
        }}>
          <span style={{ color: "var(--text-main)", fontWeight: 650, fontSize: 13, letterSpacing: 0 }}>
            Workflow
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
            {agents.length} terminal{agents.length !== 1 ? "s" : ""}
            {drawLinks.length > 0 ? ` - ${drawLinks.length} link${drawLinks.length !== 1 ? "s" : ""}` : ""}
          </span>
          <button
            onClick={onClose}
            style={{
              marginLeft:   "auto",
              background:   "transparent",
              border:       "none",
              color:        "var(--text-muted)",
              fontSize:     15,
              cursor:       "pointer",
              padding:      "4px 7px",
              lineHeight:   1,
              borderRadius: 999,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--button-bg)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-main)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
          >x</button>
        </div>

        {/* ── Canvas ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", background: "var(--surface-0)" }}>

          {/* Empty states */}
          {agents.length === 0 && (
            <div style={{
              position:       "absolute",
              inset:          0,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          "var(--text-muted)",
              fontSize:       13,
              letterSpacing:  0,
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
              color:     "var(--text-faint)",
              fontSize:  11,
              letterSpacing: 0,
            }}>
              No manual handoffs recorded yet
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
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--text-faint)" />
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
                    stroke="var(--border-strong)"
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
                        background:     "var(--surface-1)",
                        border:         "1px solid var(--border-subtle)",
                        borderRadius:   999,
                        padding:        "3px 7px",
                        whiteSpace:     "nowrap",
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: 0 }}>
                        {label}
                      </span>
                      <button
                        onClick={() => onRemoveLink(link.id)}
                        style={{
                          background:   "none",
                          border:       "none",
                          color:        "var(--text-faint)",
                          fontSize:     10,
                          cursor:       "pointer",
                          padding:      0,
                          lineHeight:   1,
                          flexShrink:   0,
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--danger)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-faint)"; }}
                      >x</button>
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
                  background:    "var(--surface-1)",
                  border:        `1px solid ${lc === "running" ? "var(--border-strong)" : "var(--border-subtle)"}`,
                  borderRadius:  12,
                  display:       "flex",
                  alignItems:    "center",
                  gap:           8,
                  padding:       "8px 10px",
                  boxShadow:     "none",
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
                    color:         "var(--text-main)",
                    fontSize:      11,
                    fontWeight:    650,
                    letterSpacing: 0,
                    overflow:      "hidden",
                    textOverflow:  "ellipsis",
                    whiteSpace:    "nowrap",
                  }}>
                    {agent.label}
                  </span>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{
                      color:         "var(--text-muted)",
                      fontSize:      9,
                      letterSpacing: 0,
                      background:    "var(--button-bg)",
                      padding:       "2px 6px",
                      borderRadius:  999,
                    }}>
                      {kind}
                    </span>
                    <span style={{
                      color:         lcColor(lc),
                      fontSize:      9,
                      letterSpacing: 0,
                      fontWeight:    600,
                    }}>
                      {lc.toUpperCase()}
                    </span>
                  </div>
                  <span style={{
                    color:         "var(--text-faint)",
                    fontSize:      9,
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
