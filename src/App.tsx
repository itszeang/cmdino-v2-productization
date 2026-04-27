import { useMemo } from "react";
import { TerminalGrid } from "./components/TerminalGrid";
import { createTerminalAgent } from "./domain/terminalAgent";
import { preloadDino } from "./dino/assetLoader";

preloadDino("female-cole");

export default function App() {
  const agents = useMemo(
    () => [
      createTerminalAgent("agent-1", "Claude Builder",  "female-cole"),
      createTerminalAgent("agent-2", "Codex Reviewer", "female-cole"),
    ],
    []
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        background: "#080b0f",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          height: 36,
          background: "#060a0d",
          borderBottom: "1px solid #0a1a24",
          flexShrink: 0,
          gap: 10,
        }}
      >
        <span
          style={{
            color: "#00c8ff",
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          CMDino
        </span>
        <span style={{ color: "#1a3a4a", fontSize: 11 }}>v0.1B · Real Terminal Bridge</span>
        <span
          style={{
            marginLeft: "auto",
            color: "#0e2233",
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          PTY BRIDGE
        </span>
      </div>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <TerminalGrid agents={agents} />
      </div>
    </div>
  );
}
