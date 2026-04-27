import { useRef } from "react";
import { DinoLane } from "../dino/DinoLane";
import type { TerminalAgent } from "../domain/terminalAgent";
import {
  useTerminalProcess,
  type TerminalLifecycleState,
} from "../terminal/useTerminalProcess";

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
  spawning: "#facc15",
  running:  "#00c8ff",
  exited:   "#6b7280",
  killed:   "#6b7280",
  error:    "#f87171",
};

function dotColor(state: string): string {
  return STATE_COLORS[state] ?? "#1e3a4a";
}

function lifecycleLabel(lc: TerminalLifecycleState): string {
  return lc.toUpperCase();
}

// Small header icon button
function HdrBtn({
  title,
  onClick,
  children,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        color: "#2a3a4a",
        fontSize: 12,
        lineHeight: 1,
        cursor: "pointer",
        padding: "2px 5px",
        borderRadius: 3,
        fontFamily: "inherit",
        transition: "color 0.12s",
        flexShrink: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = danger ? "#f87171" : "#7dd3fc";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a";
      }}
    >
      {children}
    </button>
  );
}

interface Props {
  agent: TerminalAgent;
  onRemove: (id: string) => void;
}

export function TerminalPane({ agent, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { dinoState, lifecycle, clear, copyVisible, restart, kill } =
    useTerminalProcess({
      agentId: agent.id,
      containerRef,
      cwd: agent.cwd,
      launchCommand: agent.launchCommand,
    });

  const color       = dotColor(dinoState);
  const lcColor     = LIFECYCLE_COLORS[lifecycle];
  const pulse       = dinoState === "patrol_running" || dinoState === "heavy_processing";
  const isAlive     = lifecycle === "running" || lifecycle === "spawning";

  async function handleRemove() {
    if (isAlive && !window.confirm(`Kill "${agent.label}"?`)) return;
    await kill();
    onRemove(agent.id);
  }

  async function handleRestart() {
    if (isAlive && !window.confirm(`Restart "${agent.label}"?`)) return;
    restart();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        background: "#0b0f14",
        border: "1px solid #0e2233",
        borderRadius: 6,
        overflow: "hidden",
        height: "100%",
        boxShadow: "0 0 32px rgba(0,200,255,0.05)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 8px 5px 12px",
          background: "#0d1520",
          borderBottom: "1px solid #0e2233",
          flexShrink: 0,
        }}
      >
        {/* Status dot */}
        <div
          className={pulse ? "status-dot-pulse" : undefined}
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            boxShadow:
              dinoState !== "terminal_dead" && dinoState !== "idle_center"
                ? `0 0 8px ${color}, 0 0 16px ${color}40`
                : "none",
            transition: "background 0.25s, box-shadow 0.25s",
            flexShrink: 0,
          }}
        />

        {/* Label */}
        <span style={{ color: "#7dd3fc", fontWeight: 700, fontSize: 12, letterSpacing: 0.5 }}>
          {agent.label}
        </span>

        {/* Lifecycle badge */}
        <span
          style={{
            marginLeft: "auto",
            color: lcColor,
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 600,
            transition: "color 0.25s",
            flexShrink: 0,
          }}
        >
          {lifecycleLabel(lifecycle)}
        </span>

        {/* ── Action buttons ── */}
        <HdrBtn title="Copy visible output" onClick={() => { void copyVisible(); }}>
          ⎘
        </HdrBtn>
        <HdrBtn title="Clear terminal" onClick={clear}>
          ⌫
        </HdrBtn>
        <HdrBtn title="Restart terminal" onClick={() => { void handleRestart(); }}>
          ↺
        </HdrBtn>
        <HdrBtn title="Close terminal" onClick={() => { void handleRemove(); }} danger>
          ✕
        </HdrBtn>
      </div>

      {/* xterm.js container */}
      <div
        ref={containerRef}
        style={{ flex: 1, overflow: "hidden", background: "#070b0e", minHeight: 0 }}
      />

      {/* DinoLane */}
      <DinoLane dinoId={agent.dinoId} state={dinoState} />
    </div>
  );
}
