import { useEffect, useState } from "react";
import { TerminalGrid }       from "./components/TerminalGrid";
import { AgentCreationModal } from "./components/AgentCreationModal";
import { WorkspaceToolbar }   from "./components/WorkspaceToolbar";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";
import { workspaceBridge }    from "./workspace/workspaceBridge";
import { validateWorkspaceFile, sanitizeWorkspaceFilename } from "./domain/workspace";
import type { AgentKind }     from "./domain/agentKind";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

export default function App() {
  const {
    agents,
    workspaceName,
    setWorkspaceName,
    runningAgentIds,
    addAgent,
    removeAgent,
    addAttachment,
    removeAttachment,
    startAgent,
    startAll,
    resetWorkspace,
    loadWorkspaceConfig,
    buildWorkspaceFile,
    count,
    maxReached,
  } = useTerminalAgents();

  const [showModal,       setShowModal]       = useState(false);
  const [savedWorkspaces, setSavedWorkspaces] = useState<string[]>([]);

  // ── Workspace file list ────────────────────────────────────────────────────

  async function refreshList() {
    if (!isTauri) return;
    try {
      const list = await workspaceBridge.list();
      setSavedWorkspaces(list);
    } catch { /* silently ignore — not critical */ }
  }

  useEffect(() => { void refreshList(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Workspace operations ───────────────────────────────────────────────────

  function handleNew() {
    if (agents.length > 0) {
      if (!window.confirm("Clear current workspace and start fresh?")) return;
    }
    resetWorkspace("Untitled Workspace");
  }

  async function handleSave() {
    if (!isTauri) {
      alert("Workspace save requires the desktop app.");
      return;
    }
    try {
      const file     = buildWorkspaceFile();
      const json     = JSON.stringify(file, null, 2);
      const fileName = sanitizeWorkspaceFilename(workspaceName);
      await workspaceBridge.save(fileName, json);
      await refreshList();
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function handleLoad(name: string) {
    if (!isTauri) {
      alert("Workspace load requires the desktop app.");
      return;
    }
    if (runningAgentIds.size > 0) {
      if (!window.confirm(`Kill ${runningAgentIds.size} running terminal(s) and load "${name}"?`)) return;
    } else if (agents.length > 0) {
      if (!window.confirm(`Replace current workspace with "${name}"?`)) return;
    }
    try {
      const raw       = await workspaceBridge.load(name);
      const parsed    = JSON.parse(raw) as unknown;
      const validated = validateWorkspaceFile(parsed);
      loadWorkspaceConfig(validated);
    } catch (err) {
      alert(`Load failed: ${err instanceof Error ? err.message : String(err)}`);
      await refreshList(); // file may have been deleted
    }
  }

  // ── Terminal creation ──────────────────────────────────────────────────────

  function handleCreate(form: {
    label: string;
    command: string;
    cwd: string;
    dinoId: string;
    agentKind: AgentKind;
  }) {
    addAgent(
      {
        label:         form.label,
        dinoId:        form.dinoId,
        launchCommand: form.command || undefined,
        cwd:           form.cwd    || undefined,
        agentKind:     form.agentKind,
      },
      true, // auto-start newly created terminals
    );
    setShowModal(false);
  }

  return (
    <div
      style={{
        width:          "100vw",
        height:         "100vh",
        background:     "#080b0f",
        display:        "flex",
        flexDirection:  "column",
        overflow:       "hidden",
      }}
    >
      {/* Toolbar */}
      <WorkspaceToolbar
        workspaceName={workspaceName}
        onNameChange={setWorkspaceName}
        onNew={handleNew}
        onSave={() => { void handleSave(); }}
        onLoad={(name) => { void handleLoad(name); }}
        onRefreshList={() => { void refreshList(); }}
        savedWorkspaces={savedWorkspaces}
        onStartAll={startAll}
        onAddTerminal={() => setShowModal(true)}
        terminalCount={count}
        maxTerminals={MAX_TERMINALS}
        maxReached={maxReached}
      />

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {count === 0 ? (
          /* ── Empty state ── */
          <div
            style={{
              display:        "flex",
              flexDirection:  "column",
              alignItems:     "center",
              justifyContent: "center",
              height:         "100%",
              gap:            20,
              color:          "#1e3a4a",
              userSelect:     "none",
            }}
          >
            <div
              style={{
                width:               144,
                height:              144,
                backgroundImage:     'url("/female/cole/base/idle.png")',
                backgroundSize:      "432px 144px",
                backgroundPosition:  "0 0",
                backgroundRepeat:    "no-repeat",
                imageRendering:      "pixelated",
                opacity:             0.25,
              }}
            />
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, color: "#2a4a5a" }}>
              Create Your First Dino Terminal
            </div>
            <div style={{ fontSize: 12, color: "#1a3040" }}>
              Up to {MAX_TERMINALS} concurrent terminals · Real PTY · Dino state feedback
            </div>
            <button
              onClick={() => setShowModal(true)}
              style={{
                marginTop:     8,
                padding:       "10px 24px",
                background:    "#00c8ff0f",
                border:        "1px solid #00c8ff44",
                borderRadius:  6,
                color:         "#00c8ff",
                fontSize:      13,
                fontFamily:    "inherit",
                fontWeight:    700,
                letterSpacing: 1.5,
                cursor:        "pointer",
                transition:    "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f"; }}
            >
              + NEW TERMINAL
            </button>
          </div>
        ) : (
          <TerminalGrid
            agents={agents}
            onRemove={removeAgent}
            runningAgentIds={runningAgentIds}
            onStart={startAgent}
            onAddAttachment={addAttachment}
            onRemoveAttachment={removeAttachment}
          />
        )}
      </div>

      {/* Agent creation modal */}
      {showModal && (
        <AgentCreationModal
          onConfirm={handleCreate}
          onCancel={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
