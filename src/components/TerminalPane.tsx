import { useCallback, useEffect, useRef, useState } from "react";
import { DinoLane } from "../dino/DinoLane";
import type { TerminalAgent } from "../domain/terminalAgent";
import {
  type DinoState,
  type SimTrigger,
  triggerToState,
} from "../terminal/dinoStateMachine";

const SIM_BUTTONS: { label: string; trigger: SimTrigger; color: string }[] = [
  { label: "Running",  trigger: "running",  color: "#00c8ff" },
  { label: "Thinking", trigger: "thinking", color: "#a855f7" },
  { label: "Success",  trigger: "success",  color: "#22c55e" },
  { label: "Error",    trigger: "error",    color: "#f87171" },
  { label: "Dead",     trigger: "dead",     color: "#6b7280" },
];

const SIM_LOG_LINES: Record<SimTrigger, string[]> = {
  running:  ["> Executing task...", "> Writing files...", "> Building output..."],
  thinking: ["> Analyzing context...", "> Processing...", "> Searching codebase..."],
  success:  ["> Done.", "> Task completed successfully.", "> ✓ All checks passed."],
  error:    ["> ERROR: Unexpected failure.", "> Exception thrown.", "> Process exited with code 1."],
  dead:     ["> Process terminated.", "> Session closed."],
};

interface Props {
  agent: TerminalAgent;
}

export function TerminalPane({ agent }: Props) {
  const [dinoState, setDinoState] = useState<DinoState>("idle_center");
  const [logs, setLogs] = useState<string[]>([`> Agent "${agent.label}" ready.`]);
  const [activeTrigger, setActiveTrigger] = useState<SimTrigger | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const trigger = useCallback((t: SimTrigger) => {
    setActiveTrigger(t);
    setDinoState(triggerToState(t));
    const lines = SIM_LOG_LINES[t];
    const line = lines[Math.floor(Math.random() * lines.length)];
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [...prev.slice(-120), `[${ts}] ${line}`]);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

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
        boxShadow: "0 0 24px rgba(0,200,255,0.04)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 12px",
          background: "#0d1520",
          borderBottom: "1px solid #0e2233",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: activeTrigger === "dead" ? "#6b7280"
              : activeTrigger === "error"   ? "#f87171"
              : activeTrigger === "success" ? "#22c55e"
              : "#00c8ff",
            boxShadow: activeTrigger === "dead" ? "none"
              : `0 0 6px currentColor`,
            transition: "background 0.3s, box-shadow 0.3s",
          }}
        />
        <span style={{ color: "#7dd3fc", fontWeight: 600, fontSize: 12 }}>
          {agent.label}
        </span>
        <span
          style={{
            marginLeft: "auto",
            color: "#334455",
            fontSize: 11,
            letterSpacing: 1,
          }}
        >
          {agent.dinoId}
        </span>
      </div>

      {/* Log area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          lineHeight: 1.7,
          fontSize: 12,
          color: "#8899aa",
          background: "#080c10",
        }}
      >
        {logs.map((line, i) => (
          <div
            key={i}
            style={{
              color: line.includes("ERROR") || line.includes("Exception") || line.includes("exited with")
                ? "#f87171"
                : line.includes("Done") || line.includes("success") || line.includes("✓")
                ? "#4ade80"
                : line.includes("terminated") || line.includes("closed")
                ? "#6b7280"
                : "#8899aa",
            }}
          >
            {line}
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Dino Lane */}
      <DinoLane dinoId={agent.dinoId} state={dinoState} />

      {/* Simulation controls */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 10px",
          background: "#0d1520",
          borderTop: "1px solid #0e2233",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        {SIM_BUTTONS.map(({ label, trigger: t, color }) => (
          <button
            key={t}
            onClick={() => trigger(t)}
            style={{
              flex: 1,
              minWidth: 60,
              padding: "4px 8px",
              background: activeTrigger === t ? `${color}22` : "#0b0f14",
              border: `1px solid ${activeTrigger === t ? color : "#1a2a3a"}`,
              borderRadius: 4,
              color: activeTrigger === t ? color : "#445566",
              fontSize: 11,
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
              letterSpacing: 0.5,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = color;
              (e.currentTarget as HTMLButtonElement).style.color = color;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor =
                activeTrigger === t ? color : "#1a2a3a";
              (e.currentTarget as HTMLButtonElement).style.color =
                activeTrigger === t ? color : "#445566";
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
