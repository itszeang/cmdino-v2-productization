import { useRef } from "react";
import { DinoLane } from "../dino/DinoLane";
import type { TerminalAgent } from "../domain/terminalAgent";
import { useTerminalProcess } from "../terminal/useTerminalProcess";

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

function dotColor(state: string): string {
  return STATE_COLORS[state] ?? "#1e3a4a";
}

function stateLabel(state: string): string {
  return state.replace(/_/g, " ").toUpperCase();
}

interface Props {
  agent: TerminalAgent;
  onRemove: (id: string) => void;
}

export function TerminalPane({ agent, onRemove }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { dinoState, ready } = useTerminalProcess({
    agentId: agent.id,
    containerRef,
    cwd: agent.cwd,
    launchCommand: agent.launchCommand,
  });

  const color = dotColor(dinoState);
  const pulse =
    dinoState === "patrol_running" || dinoState === "heavy_processing";

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
          gap: 8,
          padding: "7px 10px 7px 12px",
          background: "#0d1520",
          borderBottom: "1px solid #0e2233",
          flexShrink: 0,
        }}
      >
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
        <span
          style={{
            color: "#7dd3fc",
            fontWeight: 700,
            fontSize: 12,
            letterSpacing: 0.5,
          }}
        >
          {agent.label}
        </span>

        {/* State badge */}
        <span
          style={{
            marginLeft: "auto",
            color: ready ? color : "#334455",
            fontSize: 10,
            letterSpacing: 1.5,
            fontWeight: 600,
            transition: "color 0.25s",
          }}
        >
          {ready ? stateLabel(dinoState) : "CONNECTING…"}
        </span>

        {/* Close button */}
        <button
          onClick={() => onRemove(agent.id)}
          title="Close terminal"
          style={{
            marginLeft: 8,
            background: "none",
            border: "none",
            color: "#2a3a4a",
            fontSize: 14,
            lineHeight: 1,
            cursor: "pointer",
            padding: "2px 4px",
            borderRadius: 3,
            transition: "color 0.15s",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a"; }}
        >
          ✕
        </button>
      </div>

      {/* xterm.js container */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflow: "hidden",
          background: "#070b0e",
          minHeight: 0,
        }}
      />

      {/* DinoLane */}
      <DinoLane dinoId={agent.dinoId} state={dinoState} />
    </div>
  );
}
