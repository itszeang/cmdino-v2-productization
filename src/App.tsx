import { useCallback, useEffect, useState } from "react";
import { TerminalGrid }        from "./components/TerminalGrid";
import { AgentCreationModal }  from "./components/AgentCreationModal";
import { AppSidebar }          from "./components/AppSidebar";
import { MainHeader }          from "./components/MainHeader";
import { EmptyStateMascot }    from "./components/EmptyStateMascot";
import { WorkflowPanel }       from "./components/WorkflowPanel";
import { SettingsPanel }       from "./components/SettingsPanel";
import { WelcomeModal }        from "./components/WelcomeModal";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";
import { useAppSettings }      from "./state/useAppSettings";
import { workspaceBridge }     from "./workspace/workspaceBridge";
import { validateWorkspaceFile, sanitizeWorkspaceFilename } from "./domain/workspace";
import type { TerminalViewMode } from "./domain/viewMode";
import type { AgentKind }      from "./domain/agentKind";
import type { WorkflowLinkKind } from "./domain/workflow";
import type { TerminalLifecycleState } from "./terminal/useTerminalProcess";
import { DEMO_WORKSPACE }      from "./config/demoWorkspace";

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

  // ── View mode (UI-only, never persisted) ───────────────────────────────────
  const [viewMode,         setViewMode]         = useState<TerminalViewMode>("focus");
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Active terminal safety: keep activeTerminalId valid as agents change
  useEffect(() => {
    if (agents.length === 0) {
      setActiveTerminalId(null);
      return;
    }
    if (activeTerminalId === null || !agents.find((a) => a.id === activeTerminalId)) {
      setActiveTerminalId(agents[0].id);
    }
  }, [agents, activeTerminalId]);

  // Derived active label for header
  const activeTerminalLabel = agents.find((a) => a.id === activeTerminalId)?.label;

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

  // ── Terminal creation ─────────────────────────────────────────────────────

  function handleCreate(form: {
    label: string; command: string; cwd: string; dinoId: string; agentKind: AgentKind;
  }) {
    const id = addAgent(
      {
        label:         form.label,
        dinoId:        form.dinoId,
        launchCommand: form.command || undefined,
        cwd:           form.cwd    || undefined,
        agentKind:     form.agentKind,
      },
      false,
    );
    if (id) setActiveTerminalId(id);
    setShowModal(false);
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="app-shell" data-theme={settings.themeMode}>

      {/* Left sidebar */}
      <AppSidebar
        onAddTerminal={() => setShowModal(true)}
        onLoadDemo={loadDemoWorkspace}
        onOpenWorkflow={() => setShowWorkflow(true)}
        onNew={handleNew}
        onSave={() => { void handleSave(); }}
        onLoad={(name) => { void handleLoad(name); }}
        onRefreshList={() => { void refreshList(); }}
        savedWorkspaces={savedWorkspaces}
        onOpenSettings={() => setShowSettings(true)}
        onStartAll={startAll}
        terminalCount={count}
        maxTerminals={MAX_TERMINALS}
        maxReached={maxReached}
      />

      {/* Main workspace column */}
      <main className="workspace-shell">

        <MainHeader
          workspaceName={workspaceName}
          onNameChange={setWorkspaceName}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((m) => m === "focus" ? "grid" : "focus")}
          activeTerminalLabel={activeTerminalLabel}
        />

        <section className="workspace-body">
          {count === 0 ? (
            /* Empty state */
            <div className="empty-workspace">
              <EmptyStateMascot size={72} />
              <div className="empty-workspace-title">Create Your First Dino Terminal</div>
              <div className="empty-workspace-sub">
                Up to {MAX_TERMINALS} concurrent terminals · Real PTY · Dino state feedback
              </div>
              <div className="empty-workspace-actions">
                <button
                  className="empty-cta-primary"
                  onClick={() => setShowModal(true)}
                  disabled={maxReached}
                >
                  + New Terminal
                </button>
                <button
                  className="empty-cta-secondary"
                  onClick={loadDemoWorkspace}
                >
                  Load Demo
                </button>
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
              viewMode={viewMode}
              activeTerminalId={activeTerminalId}
              onActiveTerminalChange={setActiveTerminalId}
              lifecycleByAgentId={lifecycleByAgentId}
            />
          )}
        </section>
      </main>

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
