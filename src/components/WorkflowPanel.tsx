import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { WorkflowLink, WorkflowNodePositions, WorkflowNodePosition } from "../domain/workflow";

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W  = 158;
const NODE_H  = 92;
const PANEL_W = 860;
const PANEL_H = 560;
const HEADER_H = 45;
const CANVAS_H = PANEL_H - HEADER_H;
const CX      = PANEL_W / 2;
const CY      = CANVAS_H / 2;

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

function computeDefaultPositions(n: number): NodePos[] {
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

function clampPos(x: number, y: number): NodePos {
  const pad = 8;
  return {
    x: Math.max(pad, Math.min(PANEL_W - NODE_W - pad, x)),
    y: Math.max(pad, Math.min(CANVAS_H - NODE_H - pad, y)),
  };
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
  agents:                     TerminalAgent[];
  workflowLinks:              WorkflowLink[];
  workflowNodePositions:      WorkflowNodePositions;
  lifecycleByAgentId:         Record<string, string>;
  onRemoveLink:               (id: string) => void;
  onClose:                    () => void;
  onUpdateNodePosition:       (configId: string, pos: WorkflowNodePosition) => void;
  onResetLayout:              () => void;
  onCreateRoute:              (sourceConfigId: string, targetConfigId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkflowPanel({
  agents, workflowLinks, workflowNodePositions, lifecycleByAgentId,
  onRemoveLink, onClose, onUpdateNodePosition, onResetLayout, onCreateRoute,
}: Props) {
  // Merge saved positions with computed fallbacks
  const defaultPositions = computeDefaultPositions(agents.length);
  const posMap = new Map<string, NodePos>(
    agents.map((a, i) => {
      const saved = workflowNodePositions[a.configId];
      return [a.configId, saved ?? defaultPositions[i]];
    })
  );

  // Local drag state (not persisted until pointerup)
  const [dragState, setDragState] = useState<{
    configId: string;
    startPx: number; startPy: number;
    startNx: number; startNy: number;
  } | null>(null);
  const [livePos, setLivePos] = useState<Record<string, NodePos>>({});

  // Route creation mode
  const [routeSource, setRouteSource] = useState<string | null>(null);

  // Effective positions: live overrides during drag
  function getPos(configId: string): NodePos {
    return livePos[configId] ?? posMap.get(configId) ?? { x: 0, y: 0 };
  }

  // Only draw links where both ends exist
  const drawLinks = workflowLinks.filter(
    (l) => posMap.has(l.sourceConfigId) && posMap.has(l.targetConfigId),
  );

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const svgRef = useRef<SVGSVGElement>(null);

  const handlePointerDown = useCallback((
    e: React.PointerEvent<HTMLDivElement>,
    configId: string,
  ) => {
    // In route creation mode skip drag entirely so the click event fires
    // reliably for target selection.
    if (routeSource) return;

    const target = e.target as HTMLElement;
    // Ignore clicks on interactive children
    if (target.closest("button, select, input, a")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pos = posMap.get(configId) ?? { x: 0, y: 0 };
    setDragState({
      configId,
      startPx: e.clientX,
      startPy: e.clientY,
      startNx: pos.x,
      startNy: pos.y,
    });
  }, [posMap, routeSource]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState) return;
    const dx = e.clientX - dragState.startPx;
    const dy = e.clientY - dragState.startPy;
    const clamped = clampPos(dragState.startNx + dx, dragState.startNy + dy);
    setLivePos((prev) => ({ ...prev, [dragState.configId]: clamped }));
  }, [dragState]);

  const handlePointerUp = useCallback((
    _e: React.PointerEvent<HTMLDivElement>,
    configId: string,
  ) => {
    if (!dragState || dragState.configId !== configId) return;
    const finalPos = livePos[configId];
    if (finalPos) {
      onUpdateNodePosition(configId, finalPos);
      setLivePos((prev) => {
        const next = { ...prev };
        delete next[configId];
        return next;
      });
    }
    setDragState(null);
  }, [dragState, livePos, onUpdateNodePosition]);

  // ── Route creation ────────────────────────────────────────────────────────

  const handleRouteButtonClick = useCallback((
    e: React.MouseEvent,
    configId: string,
  ) => {
    e.stopPropagation();
    if (routeSource === configId) {
      setRouteSource(null);
    } else {
      setRouteSource(configId);
    }
  }, [routeSource]);

  const handleNodeClick = useCallback((configId: string) => {
    if (!routeSource) return;
    if (routeSource === configId) {
      setRouteSource(null);
      return;
    }
    onCreateRoute(routeSource, configId);
    setRouteSource(null);
  }, [routeSource, onCreateRoute]);

  // Cancel route mode on Escape
  useEffect(() => {
    if (!routeSource) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRouteSource(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [routeSource]);

  // ── Reset layout ──────────────────────────────────────────────────────────

  const handleResetLayout = useCallback(() => {
    setLivePos({});
    onResetLayout();
  }, [onResetLayout]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="workflow-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setRouteSource(null);
          onClose();
        }
      }}
    >
      <div
        className="workflow-panel"
        style={{ width: PANEL_W, height: PANEL_H }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="workflow-header" style={{ height: HEADER_H }}>
          <span className="workflow-kicker">Agent Map</span>
          <span className="workflow-meta">
            {agents.length} terminal{agents.length !== 1 ? "s" : ""}
            {drawLinks.length > 0 ? ` · ${drawLinks.length} link${drawLinks.length !== 1 ? "s" : ""}` : ""}
          </span>
          {routeSource && (
            <span className="workflow-route-banner">
              Route from {agents.find((a) => a.configId === routeSource)?.label ?? routeSource} — click target
            </span>
          )}
          <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={handleResetLayout}
              disabled={agents.length === 0}
              className="cmd-pill-btn"
            >
              Reset Layout
            </button>
            <button
              onClick={() => { setRouteSource(null); onClose(); }}
              className="cmd-icon-btn"
            >✕</button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          className="workflow-canvas"
          onClick={() => { if (routeSource) setRouteSource(null); }}
        >
          {agents.length === 0 && (
            <div className="workflow-empty">No agents yet</div>
          )}
          {agents.length > 0 && drawLinks.length === 0 && !routeSource && (
            <div className="workflow-hint">
              Drag to arrange · click Route on a node to set a preferred send path
            </div>
          )}

          {/* ── SVG edges ── */}
          <svg
            ref={svgRef}
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
              <marker
                id="wf-arrow-route"
                viewBox="0 0 10 10"
                refX="9" refY="5"
                markerWidth="5" markerHeight="5"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
              </marker>
            </defs>

            {drawLinks.map((link) => {
              const sp = getPos(link.sourceConfigId);
              const tp = getPos(link.targetConfigId);
              const { x1, y1, x2, y2, mx, my } = edgePoints(sp.x, sp.y, tp.x, tp.y);
              const isRoute = link.kind === "route";
              const sw = isRoute ? 2 : Math.min(1 + link.count, 5);
              const marker = isRoute ? "url(#wf-arrow-route)" : "url(#wf-arrow)";
              const label  = isRoute
                ? "route"
                : (link.kind === "handoff" ? "handoff" : "skill send") +
                  (link.count > 1 ? ` ×${link.count}` : "");

              return (
                <g key={link.id}>
                  {/* halo behind main edge */}
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className="workflow-edge-halo"
                    strokeWidth={sw + 5}
                  />
                  <line
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    className={`workflow-edge${isRoute ? " workflow-edge--route" : ""}`}
                    strokeWidth={sw}
                    markerEnd={marker}
                  />
                  <foreignObject
                    x={mx - 50}
                    y={my - 11}
                    width={100}
                    height={22}
                    style={{ pointerEvents: "all" }}
                  >
                    <div className={`workflow-edge-label-wrap${isRoute ? " workflow-edge-label-wrap--route" : ""}`}>
                      <span className={`workflow-edge-label${isRoute ? " workflow-edge-label--route" : ""}`}>
                        {label}
                      </span>
                      <button
                        className="workflow-edge-remove"
                        onClick={(e) => { e.stopPropagation(); onRemoveLink(link.id); }}
                      >✕</button>
                    </div>
                  </foreignObject>
                </g>
              );
            })}
          </svg>

          {/* ── Node cards ── */}
          {agents.map((agent) => {
            const pos        = getPos(agent.configId);
            const lc         = lifecycleByAgentId[agent.id] ?? "dormant";
            const kind       = agent.agentKind ?? "custom";
            const sprite     = dinoIdleSprite(agent.dinoId);
            const isDragging    = dragState?.configId === agent.configId;
            const isRouteTarget = routeSource !== null && routeSource !== agent.configId;
            const isRouteSource = routeSource === agent.configId;

            return (
              <div
                key={agent.id}
                className="workflow-node"
                data-lifecycle={lc}
                data-route-source={String(isRouteSource)}
                data-route-target={String(isRouteTarget)}
                data-dragging={String(isDragging)}
                style={{ left: pos.x, top: pos.y, width: NODE_W, height: NODE_H }}
                onPointerDown={(e) => handlePointerDown(e, agent.configId)}
                onPointerMove={handlePointerMove}
                onPointerUp={(e) => handlePointerUp(e, agent.configId)}
                onClick={(e) => { e.stopPropagation(); handleNodeClick(agent.configId); }}
              >
                {/* Dino avatar */}
                {sprite && (
                  <div
                    className="workflow-node-avatar"
                    style={{
                      backgroundImage:    `url("${sprite}")`,
                      backgroundSize:     "132px 44px",
                      backgroundPosition: "0 0",
                      backgroundRepeat:   "no-repeat",
                      imageRendering:     "pixelated",
                    }}
                  />
                )}

                {/* Text info */}
                <div className="workflow-node-body">
                  <span className="workflow-node-title">{agent.label}</span>
                  <div className="workflow-node-meta">
                    <span className="workflow-kind-pill">{kind}</span>
                    <span className="workflow-lifecycle" style={{ color: lcColor(lc) }}>{lc}</span>
                  </div>
                  <button
                    className="workflow-route-btn"
                    data-active={String(isRouteSource)}
                    onClick={(e) => handleRouteButtonClick(e, agent.configId)}
                  >
                    {isRouteSource ? "Cancel" : "Route"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
