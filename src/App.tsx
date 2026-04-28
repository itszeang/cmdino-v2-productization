import { useCallback, useEffect, useState } from "react";
import { TerminalGrid }       from "./components/TerminalGrid";
import { AgentCreationModal } from "./components/AgentCreationModal";
import { WorkspaceToolbar }   from "./components/WorkspaceToolbar";
import { WorkflowPanel }      from "./components/WorkflowPanel";
import { SettingsPanel }      from "./components/SettingsPanel";
import { WelcomeModal }       from "./components/WelcomeModal";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";
import { useAppSettings }     from "./state/useAppSettings";
import { workspaceBridge }    from "./workspace/workspaceBridge";
import { validateWorkspaceFile, sanitizeWorkspaceFilename } from "./domain/workspace";
import type { AgentKind }     from "./domain/agentKind";
import type { WorkflowLinkKind } from "./domain/workflow";
import type { TerminalLifecycleState } from "./terminal/useTerminalProcess";
import { DEMO_WORKSPACE }     from "./config/demoWorkspace";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

export default function App() {
  const {
    agents,
    workspaceName,
    setWorkspaceName,
    runningAgentIds,
    workflowLinks,
    addAgent,
    removeAgent,
    addAttachment,
    removeAttachment,
    recordWorkflowLink,
    removeWorkflowLink,
    startAgent,
    startAll,
    resetWorkspace,
    loadWorkspaceConfig,
    buildWorkspaceFile,
    count,
    maxReached,
  } = useTerminalAgents();

  const { settings, updateSettings, resetSettings } = useAppSettings();

  const [showModal,           setShowModal]           = useState(false);
  const [showWorkflow,        setShowWorkflow]        = useState(false);
  const [showSettings,        setShowSettings]        = useState(false);
  const [savedWorkspaces,     setSavedWorkspaces]     = useState<string[]>([]);
  const [lifecycleByAgentId,  setLifecycleByAgentId]  = useState<Record<string, string>>({});

  // ── Lifecycle tracking ─────────────────────────────────────────────────────

  const handleLifecycleChange = useCallback((agentId: string, lifecycle: TerminalLifecycleState) => {
    setLifecycleByAgentId((prev) =>
      prev[agentId] === lifecycle ? prev : { ...prev, [agentId]: lifecycle }
    );
  }, []);

  const handleRecordWorkflowLink = useCallback((
    sourceAgentId: string,
    targetAgentId: string,
    kind:          WorkflowLinkKind,
  ) => {
    recordWorkflowLink(sourceAgentId, targetAgentId, kind);
  }, [recordWorkflowLink]);

  // ── Workspace file list ────────────────────────────────────────────────────

  async function refreshList() {
    if (!isTauri) return;
    try {
      const list = await workspaceBridge.list();
      setSavedWorkspaces(list);
    } catch { /* silently ignore */ }
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
    if (!isTauri) { alert("Workspace save requires the desktop app."); return; }
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
    if (!isTauri) { alert("Workspace load requires the desktop app."); return; }
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
      await refreshList();
    }
  }

  // ── Demo workspace ────────────────────────────────────────────────────────

  function loadDemoWorkspace() {
    if (agents.length > 0) {
      if (!window.confirm("Replace current workspace with the CMDino Alpha Demo?")) return;
    }
    loadWorkspaceConfig(DEMO_WORKSPACE);
  }

  // ── Terminal creation ──────────────────────────────────────────────────────

  function handleCreate(form: {
    label: string; command: string; cwd: string; dinoId: string; agentKind: AgentKind;
  }) {
    addAgent(
      {
        label:         form.label,
        dinoId:        form.dinoId,
        launchCommand: form.command || undefined,
        cwd:           form.cwd    || undefined,
        agentKind:     form.agentKind,
      },
      true,
    );
    setShowModal(false);
  }

  return (
    <div style={{
      width: "100vw", height: "100vh", background: "#080b0f",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
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
        onLoadDemo={loadDemoWorkspace}
        onOpenWorkflow={() => setShowWorkflow(true)}
        onOpenSettings={() => setShowSettings(true)}
        onAddTerminal={() => setShowModal(true)}
        terminalCount={count}
        maxTerminals={MAX_TERMINALS}
        maxReached={maxReached}
      />

      {/* Main content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {count === 0 ? (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            height: "100%", gap: 20, color: "#1e3a4a", userSelect: "none",
          }}>
            <div style={{
              width: 144, height: 144,
              backgroundImage: 'url("/female/cole/base/idle.png")',
              backgroundSize: "432px 144px", backgroundPosition: "0 0",
              backgroundRepeat: "no-repeat", imageRendering: "pixelated", opacity: 0.25,
            }} />
            <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1, color: "#2a4a5a" }}>
              Create Your First Dino Terminal
            </div>
            <div style={{ fontSize: 12, color: "#1a3040" }}>
              Up to {MAX_TERMINALS} concurrent terminals · Real PTY · Dino state feedback
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  padding: "10px 24px", background: "#00c8ff0f",
                  border: "1px solid #00c8ff44", borderRadius: 6, color: "#00c8ff",
                  fontSize: 13, fontFamily: "inherit", fontWeight: 700,
                  letterSpacing: 1.5, cursor: "pointer", transition: "background 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f"; }}
              >+ NEW TERMINAL</button>
              <button
                onClick={loadDemoWorkspace}
                style={{
                  padding: "10px 20px", background: "none",
                  border: "1px solid #1a3a4a", borderRadius: 6, color: "#334455",
                  fontSize: 13, fontFamily: "inherit", fontWeight: 700,
                  letterSpacing: 1.5, cursor: "pointer", transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#7dd3fc"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#00c8ff44"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#334455"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a3a4a"; }}
              >LOAD DEMO</button>
            </div>
          </div>
        ) : (
          <TerminalGrid
            agents={agents}
            onRemove={removeAgent}
            runningAgentIds={runningAgentIds}
            onStart={startAgent}
            onAddAttachment={addAttachment}
            onRemoveAttachment={removeAttachment}
            onLifecycleChange={handleLifecycleChange}
            onRecordWorkflowLink={handleRecordWorkflowLink}
            settings={settings}
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

      {/* First-launch mission briefing */}
      {!settings.onboardingDismissed && (
        <WelcomeModal
          onDismiss={(dontShow) => updateSettings({ onboardingDismissed: dontShow })}
          onLoadDemo={() => {
            loadDemoWorkspace();
            updateSettings({ onboardingDismissed: true });
          }}
        />
      )}

      {/* Settings panel overlay */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
          onShowOnboarding={() => {
            updateSettings({ onboardingDismissed: false });
            setShowSettings(false);
          }}
        />
      )}

      {/* Workflow panel overlay */}
      {showWorkflow && (
        <WorkflowPanel
          agents={agents}
          workflowLinks={workflowLinks}
          lifecycleByAgentId={lifecycleByAgentId}
          onRemoveLink={removeWorkflowLink}
          onClose={() => setShowWorkflow(false)}
        />
      )}
    </div>
  );
}
