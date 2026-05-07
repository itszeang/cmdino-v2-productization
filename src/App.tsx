import { useCallback, useEffect, useRef, useState } from "react";
import { TerminalGrid }           from "./components/TerminalGrid";
import { AgentCreationModal }     from "./components/AgentCreationModal";
import { AgentEditModal }         from "./components/AgentEditModal";
import { EmptyWorkspaceState }    from "./components/EmptyWorkspaceState";
import { AppSidebar }             from "./components/AppSidebar";
import { MainHeader }          from "./components/MainHeader";
import { WorkflowPanel }       from "./components/WorkflowPanel";
import { SettingsPanel }       from "./components/SettingsPanel";
import { WelcomeModal }        from "./components/WelcomeModal";
import { HistoryDrawer }       from "./components/HistoryDrawer";
import { TemplatePickerModal } from "./components/TemplatePickerModal";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";
import { useAppSettings }      from "./state/useAppSettings";
import { useSessionLog }       from "./state/useSessionLog";
import { useProviderHealth }   from "./state/useProviderHealth";
import { HealthPanel }         from "./components/HealthPanel";
import { useAttachmentDrop }   from "./hooks/useAttachmentDrop";
import { workspaceBridge }     from "./workspace/workspaceBridge";
import { validateWorkspaceFile, sanitizeWorkspaceFilename } from "./domain/workspace";
import type { CmdinoWorkspaceFile } from "./domain/workspace";
import type { TerminalViewMode } from "./domain/viewMode";
import type { AgentKind }      from "./domain/agentKind";
import type { TerminalAttachment } from "./domain/orchestration";
import type { GeneratedOutputFile } from "./domain/attachments";
import type { WorkflowLinkKind } from "./domain/workflow";
import type { TerminalLifecycleState } from "./terminal/useTerminalProcess";
import { DEMO_WORKSPACE }      from "./config/demoWorkspace";
import type { ReadinessFailure } from "./domain/readiness";
import { validateAgentReadiness } from "./readiness/readinessBridge";
import { buildMemoryBriefs } from "./domain/memoryBrief";
import { buildTranscriptFiles } from "./domain/transcriptExport";
import { writeMemoryBriefs, writeOutputFiles, listOutputFiles } from "./memory/memoryBriefBridge";
import { buildPublicExportKit } from "./domain/buildPublicExport";

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
    workflowNodePositions,
    addAgent,
    updateAgent,
    removeAgent,
    addAttachment,
    removeAttachment,
    recordWorkflowLink,
    removeWorkflowLink,
    updateWorkflowNodePosition,
    resetWorkflowLayout,
    createWorkflowRoute,
    startAgent,
    resetWorkspace,
    loadWorkspaceConfig,
    buildWorkspaceFile,
    count,
    maxReached,
  } = useTerminalAgents();

  const { settings, updateSettings, resetSettings } = useAppSettings();
  const { entries: sessionEntries, appendEvent, clearLog } = useSessionLog();
  const { snapshot: healthSnapshot, refresh: refreshHealth } = useProviderHealth();

  const [showModal,           setShowModal]           = useState(false);
  const [showWorkflow,        setShowWorkflow]        = useState(false);
  const [showSettings,        setShowSettings]        = useState(false);
  const [showHistory,         setShowHistory]         = useState(false);
  const [savedWorkspaces,     setSavedWorkspaces]     = useState<string[]>([]);
  const [lifecycleByAgentId,  setLifecycleByAgentId]  = useState<Record<string, string>>({});
  const [editingAgentId,      setEditingAgentId]      = useState<string | null>(null);
  const [readinessErrors,     setReadinessErrors]     = useState<Record<string, ReadinessFailure | null>>({});
  const [exportNotice,        setExportNotice]        = useState<string | null>(null);
  const [outputFiles,         setOutputFiles]         = useState<GeneratedOutputFile[]>([]);
  const [showTemplatePicker,  setShowTemplatePicker]  = useState(false);
  const [showHealth,          setShowHealth]          = useState(false);

  const transcriptGettersRef = useRef<Map<string, () => string>>(new Map());
  const paneRefsMap          = useRef<Map<string, HTMLElement>>(new Map());

  const handleRegisterPaneRef = useCallback((agentId: string, el: HTMLElement | null) => {
    if (el) paneRefsMap.current.set(agentId, el);
    else    paneRefsMap.current.delete(agentId);
  }, []);

  const handleRegisterTranscriptGetter = useCallback((agentId: string, getter: (() => string) | null) => {
    if (getter) {
      transcriptGettersRef.current.set(agentId, getter);
    } else {
      transcriptGettersRef.current.delete(agentId);
    }
  }, []);

  // ── View mode (UI-only, never persisted) ───────────────────────────────────
  const [viewMode,         setViewMode]         = useState<TerminalViewMode>("focus");
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Wire drag-drop onto pane elements
  useAttachmentDrop({
    paneRefs:      paneRefsMap,
    activeAgentId: activeTerminalId,
    onDrop: (agentId, paths) => {
      for (const path of paths) addAttachment(agentId, path, "user");
    },
  });

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

  // Close edit modal if target agent was removed
  useEffect(() => {
    if (editingAgentId && !agents.find((a) => a.id === editingAgentId)) {
      setEditingAgentId(null);
    }
  }, [agents, editingAgentId]);

  // ── Readiness errors ───────────────────────────────────────────────────────

  const handleReadinessError = useCallback((agentId: string, failure: ReadinessFailure | null) => {
    setReadinessErrors((prev) => {
      if (prev[agentId] === failure) return prev;
      return { ...prev, [agentId]: failure };
    });
  }, []);

  // Prune stale readiness errors when agents are removed.
  useEffect(() => {
    const ids = new Set(agents.map((a) => a.id));
    setReadinessErrors((prev) => {
      const stale = Object.keys(prev).filter((id) => !ids.has(id));
      if (stale.length === 0) return prev;
      const next = { ...prev };
      for (const id of stale) delete next[id];
      return next;
    });
  }, [agents]);

  // Readiness-aware Start All: validate dormant agents; only start valid ones.
  const handleStartAll = useCallback(async () => {
    const dormant = agents.filter((a) => !runningAgentIds.has(a.id));
    if (dormant.length === 0) return;
    const results = await Promise.all(
      dormant.map(async (a) => ({ id: a.id, result: await validateAgentReadiness(a) }))
    );
    const newErrors: Record<string, ReadinessFailure | null> = {};
    for (const { id, result } of results) {
      if (result.ok) {
        startAgent(id);
        newErrors[id] = null;
      } else {
        newErrors[id] = result.failure;
      }
    }
    setReadinessErrors((prev) => ({ ...prev, ...newErrors }));
  }, [agents, runningAgentIds, startAgent]);

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

  useEffect(() => {
    void refreshList();
    void refreshOutputFiles();
    void refreshHealth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshOutputFiles() {
    if (!isTauri) return;
    try {
      const files = await listOutputFiles();
      setOutputFiles(files);
    } catch { /* silently ignore */ }
  }

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
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: workspaceName,
        agentConfigId: "", agentLabel: "", type: "workspace_saved", payload: { name: workspaceName } });
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
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: name,
        agentConfigId: "", agentLabel: "", type: "workspace_loaded", payload: { name } });
    } catch (err) {
      alert(`Load failed: ${err instanceof Error ? err.message : String(err)}`);
      await refreshList();
    }
  }

  // ── Memory briefs ─────────────────────────────────────────────────────────

  async function handleGenerateMemoryBriefs() {
    if (!isTauri) {
      alert("Memory brief export requires the desktop app.");
      return;
    }
    if (agents.length === 0) {
      alert("No agents to generate briefs for.");
      return;
    }
    try {
      const briefs = buildMemoryBriefs({
        workspaceName,
        agents,
        workflowLinks,
        sessionEntries,
        generatedAt: Date.now(),
      });
      const result = await writeMemoryBriefs(briefs);
      setExportNotice(`Generated ${result.count} memory brief${result.count === 1 ? "" : "s"} in outputs`);
      setTimeout(() => setExportNotice(null), 4000);
      void refreshOutputFiles();
    } catch (err) {
      alert(`Memory brief generation failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Transcript export ─────────────────────────────────────────────────────

  async function handleExportTranscripts() {
    if (!isTauri) {
      alert("Transcript export requires the desktop app.");
      return;
    }
    if (agents.length === 0) {
      alert("No agents to export transcripts for.");
      return;
    }
    try {
      const files = buildTranscriptFiles({
        workspaceName,
        agents,
        generatedAt: Date.now(),
        getTranscriptForAgent: (agentId) => transcriptGettersRef.current.get(agentId)?.() ?? "",
      });
      const result = await writeMemoryBriefs(files);
      setExportNotice(`Exported ${result.count} transcript${result.count === 1 ? "" : "s"} in outputs`);
      setTimeout(() => setExportNotice(null), 4000);
      void refreshOutputFiles();
    } catch (err) {
      alert(`Transcript export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Build-in-Public Export Kit ────────────────────────────────────────────

  async function handleGenerateBuildUpdateKit() {
    if (!isTauri) {
      alert("Build Update Kit export requires the desktop app.");
      return;
    }
    try {
      const files = buildPublicExportKit({
        workspaceName,
        agents,
        workflowLinks,
        sessionEntries,
        outputFiles,
        generatedAt: Date.now(),
      });
      await writeOutputFiles(files);
      setExportNotice("Generated Build-in-Public kit in outputs");
      setTimeout(() => setExportNotice(null), 4000);
      void refreshOutputFiles();
    } catch (err) {
      alert(`Build Update Kit failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ── Workspace templates ───────────────────────────────────────────────────

  function handleLoadTemplate(workspace: CmdinoWorkspaceFile) {
    loadWorkspaceConfig(workspace);
    updateSettings({ onboardingDismissed: true });
    setShowTemplatePicker(false);
  }

  // ── Demo workspace ────────────────────────────────────────────────────────

  function loadDemoWorkspace() {
    if (agents.length > 0) {
      if (!window.confirm("Replace current workspace with the CMDino Alpha Demo?")) return;
    }
    loadWorkspaceConfig(DEMO_WORKSPACE);
  }

  // ── Terminal creation ─────────────────────────────────────────────────────

  function handleFocusPane(id: string) {
    if (viewMode === "focus" && activeTerminalId === id) {
      setViewMode("grid");
    } else {
      setActiveTerminalId(id);
      setViewMode("focus");
    }
  }

  function handleFocusTarget(id: string) {
    setActiveTerminalId(id);
    setViewMode("focus");
  }

  function handleCreate(form: {
    label: string; command: string; cwd: string; dinoId: string; agentKind: AgentKind;
    initialAttachments?: TerminalAttachment[];
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
      form.initialAttachments ?? [],
    );
    if (id) {
      setActiveTerminalId(id);
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: workspaceName,
        agentConfigId: "", agentLabel: form.label, type: "agent_created", payload: {} });
    }
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
        onOpenHealth={() => setShowHealth(true)}
        onNew={handleNew}
        onSave={() => { void handleSave(); }}
        onLoad={(name) => { void handleLoad(name); }}
        onRefreshList={() => { void refreshList(); }}
        savedWorkspaces={savedWorkspaces}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        onStartAll={() => { void handleStartAll(); }}
        onGenerateMemoryBriefs={() => { void handleGenerateMemoryBriefs(); }}
        onExportTranscripts={() => { void handleExportTranscripts(); }}
        onGenerateBuildUpdateKit={() => { void handleGenerateBuildUpdateKit(); }}
        canGenerateBuildKit={agents.length > 0 || sessionEntries.length > 0}
        terminalCount={count}
        maxTerminals={MAX_TERMINALS}
        maxReached={maxReached}
        healthSnapshot={healthSnapshot}
      />

      {exportNotice && (
        <div className="toast">{exportNotice}</div>
      )}

      {/* Main workspace column */}
      <main className="workspace-shell">

        <MainHeader
          workspaceName={workspaceName}
          onNameChange={setWorkspaceName}
          viewMode={viewMode}
          onToggleViewMode={() => setViewMode((m) => m === "focus" ? "grid" : "focus")}
        />

        <section className="workspace-body">
          {count === 0 ? (
            <EmptyWorkspaceState
              maxTerminals={MAX_TERMINALS}
              onDeployAgent={() => setShowModal(true)}
              onLoadDemo={loadDemoWorkspace}
              onLoadTemplate={() => setShowTemplatePicker(true)}
            />
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
              onEditAgent={setEditingAgentId}
              settings={settings}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              activeTerminalId={activeTerminalId}
              onActiveTerminalChange={setActiveTerminalId}
              onFocusPane={handleFocusPane}
              workflowLinks={workflowLinks}
              onFocusTarget={handleFocusTarget}
              lifecycleByAgentId={lifecycleByAgentId}
              readinessErrors={readinessErrors}
              onReadinessError={handleReadinessError}
              onEvent={appendEvent}
              onRegisterTranscriptGetter={handleRegisterTranscriptGetter}
              generatedOutputFiles={outputFiles}
              onRefreshGeneratedOutputs={() => { void refreshOutputFiles(); }}
              onRegisterPaneRef={handleRegisterPaneRef}
            />
          )}
        </section>
      </main>

      {/* Agent creation modal */}
      {showModal && (
        <AgentCreationModal
          onConfirm={handleCreate}
          onCancel={() => setShowModal(false)}
          providerHealth={healthSnapshot}
        />
      )}

      {/* Agent edit modal */}
      {editingAgentId && (() => {
        const editAgent = agents.find((a) => a.id === editingAgentId);
        if (!editAgent) return null;
        return (
          <AgentEditModal
            agent={editAgent}
            isRunning={runningAgentIds.has(editingAgentId)}
            onConfirm={(agentId, update) => { updateAgent(agentId, update); setEditingAgentId(null); }}
            onCancel={() => setEditingAgentId(null)}
          />
        );
      })()}

      {/* First-launch mission briefing — only when no agents are loaded */}
      {!settings.onboardingDismissed && count === 0 && (
        <WelcomeModal
          onDismiss={(dontShow) => updateSettings({ onboardingDismissed: dontShow })}
          onLoadDemo={() => {
            loadDemoWorkspace();
            updateSettings({ onboardingDismissed: true });
          }}
          onDeployAgent={() => setShowModal(true)}
          onLoadTemplate={() => setShowTemplatePicker(true)}
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
          healthSnapshot={healthSnapshot}
          onOpenHealth={() => { setShowSettings(false); setShowHealth(true); }}
        />
      )}

      {/* Workflow panel overlay */}
      {showWorkflow && (
        <WorkflowPanel
          agents={agents}
          workflowLinks={workflowLinks}
          workflowNodePositions={workflowNodePositions}
          lifecycleByAgentId={lifecycleByAgentId}
          onRemoveLink={removeWorkflowLink}
          onClose={() => setShowWorkflow(false)}
          onUpdateNodePosition={updateWorkflowNodePosition}
          onResetLayout={resetWorkflowLayout}
          onCreateRoute={createWorkflowRoute}
        />
      )}

      {/* History drawer overlay */}
      {showHistory && (
        <HistoryDrawer
          entries={sessionEntries}
          onClear={clearLog}
          onClose={() => setShowHistory(false)}
        />
      )}

      {/* Template picker overlay */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleLoadTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {/* Health panel overlay */}
      {showHealth && (
        <HealthPanel
          snapshot={healthSnapshot}
          onRefresh={() => { void refreshHealth(); }}
          onClose={() => setShowHealth(false)}
        />
      )}
    </div>
  );
}
