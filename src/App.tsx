import { useState } from "react";
import { TerminalGrid } from "./components/TerminalGrid";
import { AgentCreationModal } from "./components/AgentCreationModal";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";

export default function App() {
  const { agents, addAgent, removeAgent, count, maxReached } = useTerminalAgents();
  const [showModal, setShowModal] = useState(false);

  function openModal() { setShowModal(true); }
  function closeModal() { setShowModal(false); }

  function handleCreate(form: { label: string; command: string; cwd: string; dinoId: string; agentKind: import("./domain/agentKind").AgentKind }) {
    addAgent({
      label:         form.label,
      dinoId:        form.dinoId,
      launchCommand: form.command || undefined,
      cwd:           form.cwd || undefined,
      agentKind:     form.agentKind,
    });
    closeModal();
  }

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
          padding: "0 12px",
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
        <span style={{ color: "#1a3a4a", fontSize: 11 }}>v0.2 · Dynamic Terminals</span>

        <span style={{ marginLeft: "auto", color: "#1a3a4a", fontSize: 10, letterSpacing: 1 }}>
          {count}/{MAX_TERMINALS} ACTIVE
        </span>

        {/* New terminal button */}
        <button
          onClick={openModal}
          disabled={maxReached}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            padding: "4px 10px",
            background: maxReached ? "transparent" : "#00c8ff0f",
            border: `1px solid ${maxReached ? "#1a2a3a" : "#00c8ff44"}`,
            borderRadius: 4,
            color: maxReached ? "#1a3a4a" : "#00c8ff",
            fontSize: 11,
            fontFamily: "inherit",
            fontWeight: 700,
            letterSpacing: 1,
            cursor: maxReached ? "not-allowed" : "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            if (!maxReached) (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a";
          }}
          onMouseLeave={(e) => {
            if (!maxReached) (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f";
          }}
        >
          + TERMINAL
        </button>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {count === 0 ? (
          /* ── Empty state ── */
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              gap: 20,
              color: "#1e3a4a",
              userSelect: "none",
            }}
          >
            {/* Decorative dino: first frame of female-cole idle */}
            <div
              style={{
                width: 144,
                height: 144,
                backgroundImage: 'url("/female/cole/base/idle.png")',
                backgroundSize: "432px 144px",
                backgroundPosition: "0 0",
                backgroundRepeat: "no-repeat",
                imageRendering: "pixelated",
                opacity: 0.25,
              }}
            />
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: 1,
                color: "#2a4a5a",
              }}
            >
              Create Your First Dino Terminal
            </div>
            <div style={{ fontSize: 12, color: "#1a3040" }}>
              Up to {MAX_TERMINALS} concurrent terminals · Real PTY · Dino state feedback
            </div>
            <button
              onClick={openModal}
              style={{
                marginTop: 8,
                padding: "10px 24px",
                background: "#00c8ff0f",
                border: "1px solid #00c8ff44",
                borderRadius: 6,
                color: "#00c8ff",
                fontSize: 13,
                fontFamily: "inherit",
                fontWeight: 700,
                letterSpacing: 1.5,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f"; }}
            >
              + NEW TERMINAL
            </button>
          </div>
        ) : (
          <TerminalGrid agents={agents} onRemove={removeAgent} />
        )}
      </div>

      {/* Agent creation modal */}
      {showModal && (
        <AgentCreationModal onConfirm={handleCreate} onCancel={closeModal} />
      )}
    </div>
  );
}
