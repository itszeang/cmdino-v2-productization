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
import { OutputLibraryDrawer } from "./components/OutputLibraryDrawer";
import { ConfirmDialog }       from "./components/ConfirmDialog";
import { TemplatePickerModal } from "./components/TemplatePickerModal";
import { ProjectOpenScreen }   from "./components/ProjectOpenScreen";
import { MainTaskChat }        from "./components/MainTaskChat";
import { ContextLibraryModal } from "./components/ContextLibraryModal";
import { WorkflowRunHistoryPanel } from "./components/WorkflowRunHistoryPanel";
import { SavedWorkspaceBrowser } from "./components/SavedWorkspaceBrowser";
import { useTerminalAgents, MAX_TERMINALS } from "./state/useTerminalAgents";
import { useAppSettings }      from "./state/useAppSettings";
import { useSessionLog }       from "./state/useSessionLog";
import { useProviderHealth }   from "./state/useProviderHealth";
import { useProjectWorkspace } from "./state/useProjectWorkspace";
import { useCmdinoChat }       from "./state/useCmdinoChat";
import { useInterventions }    from "./state/useInterventions";
import { useAgentTeamSelection } from "./state/useAgentTeamSelection";
import { useWorkflowRunHistory } from "./state/useWorkflowRunHistory";
import { useWorkflowOrchestrator } from "./orchestration/useWorkflowOrchestrator";
import { terminalBridge }      from "./terminal/terminalBridge";
import { HealthPanel }         from "./components/HealthPanel";
import { useAttachmentDrop }   from "./hooks/useAttachmentDrop";
import { useAgentInteractions } from "./hooks/useAgentInteractions";
import { workspaceBridge }     from "./workspace/workspaceBridge";
import { pickProjectFolder }   from "./workspace/projectWorkspaceBridge";
import { validateWorkspaceFile, sanitizeWorkspaceFilename } from "./domain/workspace";
import type { CmdinoWorkspaceFile } from "./domain/workspace";
import { createUnknownProjectWorkspace } from "./domain/projectDetection";
import { workflowStepsFromAgentTeam, workspaceFromAgentTeam } from "./domain/agentTeam";
import { suggestTargetAgentForStep } from "./domain/agentTargetSuggestion";
import {
  createWorkflowIntervention,
  type Intervention,
  type InterventionActionKind,
} from "./domain/intervention";
import {
  createInterventionRequiredMessage,
  createSystemStatusMessage,
  createUserTaskMessage,
  createWorkflowProgressMessage,
} from "./domain/cmdinoChat";
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
import {
  buildWorkflowPromptAgentTargets,
  detectCwdMismatch,
  buildPromptFileInstruction,
  buildWorkflowResultCorrectionInstruction,
  getTerminalSubmitStrategy,
} from "./domain/workflowPromptSend";
import {
  DEFAULT_FALLBACK_AGENT_CWD,
  pathsEqual,
  resolveAgentCwd,
  resolveWorkspaceAgentCwds,
} from "./domain/agentCwd";
import {
  captureFailureMessage,
  getWorkflowResultCaptureFailureReason,
  normalizeWorkflowResultCapture,
  type WorkflowResultCapture,
} from "./domain/workflowResultCapture";
import { buildWorkflowFinalSummary } from "./domain/workflowSummary";
import {
  buildWorkflowBuildPublicKitArtifact,
  buildWorkflowFinalOutputArtifact,
  buildWorkflowStepArtifacts,
} from "./domain/workflowArtifacts";
import {
  isWorkflowRunResumable,
  type WorkflowRunHistoryEntry,
} from "./domain/workflowRunHistory";
import { buildTranscriptFiles } from "./domain/transcriptExport";
import { writeMemoryBriefs, writeOutputFiles, listOutputFiles, writePromptFile } from "./memory/memoryBriefBridge";
import { buildPublicExportKit } from "./domain/buildPublicExport";
import { saveLastSession, loadLastSession, clearLastSession } from "./domain/lastSession";
import type { LastSessionRecord } from "./domain/lastSession";
import type { CmdinoContextManifest } from "./domain/contextLibrary";
import { createEmptyContextManifest, selectContextReferences } from "./domain/contextLibrary";
import { readProjectContextManifest } from "./context/contextLibraryBridge";

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
  const {
    currentProject,
    recentProjects,
    selectProject,
    clearCurrentProject,
    removeRecentProject,
  } = useProjectWorkspace();
  const {
    messages: chatMessages,
    appendMessage: appendChatMessage,
    clearMessages: clearChatMessages,
  } = useCmdinoChat();
  const {
    interventions,
    openInterventions,
    openCount: openInterventionCount,
    addIntervention,
    resolveIntervention,
    dismissIntervention,
    clearInterventions,
  } = useInterventions();
  const {
    teams: agentTeams,
    selectedTeam,
    selectedTeamId,
    selectTeam,
    clearSelectedTeam,
  } = useAgentTeamSelection();
  const {
    entries: workflowRunHistoryEntries,
    saveRun: saveWorkflowRunHistory,
    addArtifactPaths: addWorkflowRunArtifactPaths,
  } = useWorkflowRunHistory();
  const {
    currentRun,
    startRun,
    buildPromptForCurrentStep,
    markCurrentStepPromptSent,
    completeCurrentStepFromText,
    continueToNextStep,
    cancelRun,
    clearRun,
    restoreRun,
  } = useWorkflowOrchestrator();

  const {
    pendingInteractions:     pendingAgentInteractions,
    addInteraction:          addAgentInteraction,
    markResponded:           markInteractionResponded,
    dismissInteraction:      dismissAgentInteraction,
  } = useAgentInteractions();

  const [showModal,           setShowModal]           = useState(false);
  const [showWorkflow,        setShowWorkflow]        = useState(false);
  const [showWorkflowHistory, setShowWorkflowHistory] = useState(false);
  const [showSettings,        setShowSettings]        = useState(false);
  const [showHistory,         setShowHistory]         = useState(false);
  const [savedWorkspaces,     setSavedWorkspaces]     = useState<string[]>([]);
  const [lifecycleByAgentId,  setLifecycleByAgentId]  = useState<Record<string, string>>({});
  const [editingAgentId,      setEditingAgentId]      = useState<string | null>(null);
  const [readinessErrors,     setReadinessErrors]     = useState<Record<string, ReadinessFailure | null>>({});
  const [exportNotice,        setExportNotice]        = useState<string | null>(null);
  const [outputFiles,         setOutputFiles]         = useState<GeneratedOutputFile[]>([]);
  const [contextManifest,     setContextManifest]     = useState<CmdinoContextManifest | null>(null);
  const [showTemplatePicker,  setShowTemplatePicker]  = useState(false);
  const [showWorkspaceBrowser,setShowWorkspaceBrowser]= useState(false);
  const [showHealth,          setShowHealth]          = useState(false);
  const [showOutputLibrary,   setShowOutputLibrary]   = useState(false);
  const [showContextLibrary,  setShowContextLibrary]  = useState(false);
  const [lastSession,         setLastSession]         = useState<LastSessionRecord | null>(() => loadLastSession());
  const [projectEntryDismissed, setProjectEntryDismissed] = useState(false);
  const [activeSurface,       setActiveSurface]       = useState<"chat" | "agents">("chat");
  const [confirmDialog,       setConfirmDialog]       = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    secondaryLabel?: string;
    destructive: boolean;
    onConfirm: () => void;
    onSecondary?: () => void;
  } | null>(null);

  const transcriptGettersRef = useRef<Map<string, () => string>>(new Map());
  const workflowResultCaptureRef = useRef<Map<string, () => WorkflowResultCapture>>(new Map());
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

  const handleRegisterWorkflowResultCapture = useCallback((agentId: string, getter: (() => WorkflowResultCapture) | null) => {
    if (getter) {
      workflowResultCaptureRef.current.set(agentId, getter);
    } else {
      workflowResultCaptureRef.current.delete(agentId);
    }
  }, []);

  // ── Agent Interaction Router ────────────────────────────────────────────────

  const handleInteractionDetected = useCallback((payload: Parameters<typeof addAgentInteraction>[0]) => {
    addAgentInteraction(payload);
  }, [addAgentInteraction]);

  const handleSendInteractionResponse = useCallback(async (
    interactionId: string,
    agentId: string,
    responseText: string,
  ) => {
    const agent = agents.find((a) => a.id === agentId);
    if (!agent || !runningAgentIds.has(agentId)) return;
    await terminalBridge.submitLine(
      agentId,
      responseText,
      getTerminalSubmitStrategy(agent.agentKind),
    );
    markInteractionResponded(interactionId);
    appendEvent({
      id:            crypto.randomUUID(),
      ts:            Date.now(),
      workspaceId:   workspaceName,
      agentConfigId: agent.configId,
      agentLabel:    agent.label,
      type:          "interaction_response_sent",
      payload:       { response: responseText.slice(0, 120) },
    });
  }, [agents, runningAgentIds, markInteractionResponded, appendEvent, workspaceName]);

  const handleOpenAgentTerminal = useCallback((agentId: string) => {
    setActiveSurface("agents");
    setActiveTerminalId(agentId);
  }, [setActiveSurface]);

  useEffect(() => {
    if (!currentRun) return;
    const projectName = currentProject && currentProject.id === currentRun.projectWorkspaceId
      ? currentProject.name
      : undefined;
    const agentTeamName = agentTeams.find((team) => team.id === currentRun.agentTeamId)?.name;
    saveWorkflowRunHistory(currentRun, {
      projectName,
      agentTeamName,
    });
  }, [
    agentTeams,
    currentProject?.id,
    currentProject?.name,
    currentRun,
    saveWorkflowRunHistory,
  ]);

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

  async function refreshContextManifest(projectRoot = currentProject?.rootPath) {
    if (!projectRoot) {
      setContextManifest(null);
      return;
    }
    if (!isTauri) {
      setContextManifest(createEmptyContextManifest(projectRoot));
      return;
    }
    try {
      const result = await readProjectContextManifest(projectRoot);
      setContextManifest(result.manifest);
      if (result.warning) {
        setExportNotice(result.warning);
        setTimeout(() => setExportNotice(null), 5000);
      }
    } catch {
      setContextManifest(createEmptyContextManifest(projectRoot));
    }
  }

  useEffect(() => {
    void refreshContextManifest(currentProject?.rootPath);
  }, [currentProject?.rootPath]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSelectProjectFolder() {
    try {
      const path = await pickProjectFolder();
      if (!path) {
        setExportNotice(isTauri ? "No project folder selected" : "Project folder picker requires the desktop app");
        setTimeout(() => setExportNotice(null), 4000);
        return;
      }
      const project = createUnknownProjectWorkspace(path);
      selectProject(project);
      setProjectEntryDismissed(true);
      setActiveSurface("chat");
      setExportNotice(`Project selected: ${project.name}`);
      setTimeout(() => setExportNotice(null), 4000);
    } catch (err) {
      alert(`Project folder selection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function handleOpenRecentProject(project: typeof recentProjects[number]) {
    selectProject(project);
    setProjectEntryDismissed(true);
    setActiveSurface("chat");
  }

  // ── Workspace operations ───────────────────────────────────────────────────

  function resetToCleanWorkspace() {
    resetWorkspace("Untitled Workspace");
    clearCurrentProject();
    clearChatMessages();
    clearRun();
    clearInterventions();
    clearSelectedTeam();
    setProjectEntryDismissed(false);
    setActiveSurface("chat");
    setShowWorkflowHistory(false);
    setShowOutputLibrary(false);
    setShowWorkflow(false);
  }

  function handleNew() {
    const hasWorkspaceState = agents.length > 0 ||
      chatMessages.length > 0 ||
      Boolean(currentRun) ||
      Boolean(currentProject) ||
      interventions.length > 0;
    if (!hasWorkspaceState) {
      resetToCleanWorkspace();
      return;
    }
    setConfirmDialog({
      title: "Start a new workspace?",
      body: "Save the current workspace before clearing it. Running terminals are local runtime state and will be stopped by the existing workspace reset flow.",
      confirmLabel: "Save & New",
      secondaryLabel: "Discard & New",
      destructive: false,
      onConfirm: () => {
        setConfirmDialog(null);
        void handleSave().then((saved) => {
          if (saved) resetToCleanWorkspace();
        });
      },
      onSecondary: () => {
        setConfirmDialog(null);
        resetToCleanWorkspace();
      },
    });
  }

  async function handleSave() {
    if (!isTauri) { alert("Workspace save requires the desktop app."); return false; }
    try {
      const file     = buildWorkspaceFile();
      const json     = JSON.stringify(file, null, 2);
      const fileName = sanitizeWorkspaceFilename(workspaceName);
      await workspaceBridge.save(fileName, json);
      await refreshList();
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: workspaceName,
        agentConfigId: "", agentLabel: "", type: "workspace_saved", payload: { name: workspaceName } });
      const lastEv = sessionEntries[sessionEntries.length - 1];
      const record: LastSessionRecord = {
        workspaceName,
        workspaceSlug:   fileName,
        savedAt:         Date.now(),
        agentCount:      agents.length,
        agentLabels:     agents.slice(0, 5).map((a) => a.label),
        outputCount:     outputFiles.length,
        lastEventType:   lastEv?.type,
        lastEventLabel:  lastEv?.agentLabel,
        lastEventAt:     lastEv?.ts,
      };
      saveLastSession(record);
      setLastSession(record);
      return true;
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
      return false;
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
      selectTeam(agentTeamIdForWorkspaceTemplate(validated));
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: name,
        agentConfigId: "", agentLabel: "", type: "workspace_loaded", payload: { name } });
      const lastEv = sessionEntries[sessionEntries.length - 1];
      const record: LastSessionRecord = {
        workspaceName:   validated.workspaceName,
        workspaceSlug:   name,
        savedAt:         Date.now(),
        agentCount:      validated.terminals.length,
        agentLabels:     validated.terminals.slice(0, 5).map((t) => t.label),
        outputCount:     outputFiles.length,
        lastEventType:   lastEv?.type,
        lastEventLabel:  lastEv?.agentLabel,
        lastEventAt:     lastEv?.ts,
      };
      saveLastSession(record);
      setLastSession(record);
    } catch (err) {
      alert(`Load failed: ${err instanceof Error ? err.message : String(err)}`);
      await refreshList();
    }
  }

  function handleDeleteWorkspace(name: string) {
    if (!isTauri) { alert("Workspace management requires the desktop app."); return; }
    setConfirmDialog({
      title:        "Delete workspace?",
      body:         `This removes "${name}" from saved local workspaces. Running or loaded agents in the current window are not deleted.`,
      confirmLabel: "Delete",
      destructive:  true,
      onConfirm: () => {
        setConfirmDialog(null);
        workspaceBridge.delete(name)
          .then(() => refreshList())
          .then(() => {
            if (lastSession?.workspaceSlug === name) {
              clearLastSession();
              setLastSession(null);
            }
            setExportNotice(`Workspace "${name}" deleted`);
            setTimeout(() => setExportNotice(null), 4000);
          })
          .catch((err: unknown) => {
            alert(`Delete failed: ${err instanceof Error ? err.message : String(err)}`);
          });
      },
    });
  }

  // ── Memory briefs ─────────────────────────────────────────────────────────

  async function handleGenerateMemoryBriefs() {
    if (!isTauri) {
      alert("Memory brief export requires the desktop app.");
      return;
    }
    if (agents.length === 0 && !currentRun && sessionEntries.length === 0 && outputFiles.length === 0) {
      alert("No project context is available for a memory brief yet.");
      return;
    }
    try {
      const briefs = buildMemoryBriefs({
        workspaceName,
        agents,
        workflowLinks,
        sessionEntries,
        currentRun,
        outputFiles,
        workflowArtifactPaths: currentRun
          ? workflowRunHistoryEntries.find((entry) => entry.id === currentRun.id)?.artifactPaths ?? []
          : [],
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

  function agentTeamIdForWorkspaceTemplate(workspace: CmdinoWorkspaceFile): string | null {
    const name = workspace.workspaceName.toLowerCase();
    if (name.includes("bug")) return "bug-fix-team";
    if (name.includes("public") || name.includes("fullstack") || name.includes("mobile")) return "vibe-app-builder";
    if (name.includes("research")) return "architecture-team";
    return null;
  }

  function handleLoadTemplate(workspace: CmdinoWorkspaceFile) {
    const cwdWorkspace = resolveWorkspaceAgentCwds(workspace, {
      selectedProjectRoot: currentProject?.rootPath,
      fallbackCwd: DEFAULT_FALLBACK_AGENT_CWD,
    });
    if (!currentProject?.rootPath) {
      const ok = window.confirm(
        `No project folder is selected. Template agents will use "${DEFAULT_FALLBACK_AGENT_CWD}" as their working directory. Continue?`,
      );
      if (!ok) return;
    }
    loadWorkspaceConfig(cwdWorkspace);
    selectTeam(agentTeamIdForWorkspaceTemplate(workspace));
    updateSettings({ onboardingDismissed: true });
    setActiveSurface("agents");
    setShowTemplatePicker(false);
  }

  function handleDeploySelectedTeam() {
    if (!selectedTeam) {
      setActiveSurface("agents");
      setShowTemplatePicker(true);
      return;
    }
    if (agents.length > 0) {
      const ok = window.confirm(`Replace the current Agent Workspace with ${selectedTeam.name}?`);
      if (!ok) return;
    }
    const workspace = workspaceFromAgentTeam(selectedTeam);
    const cwdWorkspace = resolveWorkspaceAgentCwds(workspace, {
      selectedProjectRoot: currentProject?.rootPath,
      fallbackCwd: DEFAULT_FALLBACK_AGENT_CWD,
    });
    if (!currentProject?.rootPath) {
      const ok = window.confirm(
        `No project folder is selected. ${selectedTeam.name} agents will use "${DEFAULT_FALLBACK_AGENT_CWD}" as their working directory. Continue?`,
      );
      if (!ok) return;
    }
    loadWorkspaceConfig(cwdWorkspace);
    selectTeam(selectedTeam.id);
    updateSettings({ onboardingDismissed: true });
    setActiveSurface("agents");
    setExportNotice(`${selectedTeam.name} deployed in Agent Workspace. Start the agents before sending prompts.`);
    setTimeout(() => setExportNotice(null), 5000);
  }

  function handleChooseSharedTeam(teamId: string | null) {
    selectTeam(teamId);
    if (teamId) {
      const team = agentTeams.find((item) => item.id === teamId);
      setExportNotice(`${team?.name ?? "Agent team"} selected. Deploy it in Agent Workspace before sending prompts.`);
      setTimeout(() => setExportNotice(null), 5000);
    }
  }

  // ── Demo workspace ────────────────────────────────────────────────────────

  function loadDemoWorkspace() {
    if (agents.length > 0) {
      if (!window.confirm("Replace current workspace with the demo setup?")) return;
    }
    if (!currentProject?.rootPath) {
      const ok = window.confirm(
        `No project folder is selected. Demo agents will use "${DEFAULT_FALLBACK_AGENT_CWD}" as their working directory. Continue?`,
      );
      if (!ok) return;
    }
    loadWorkspaceConfig(resolveWorkspaceAgentCwds(DEMO_WORKSPACE, {
      selectedProjectRoot: currentProject?.rootPath,
      fallbackCwd: DEFAULT_FALLBACK_AGENT_CWD,
    }));
    selectTeam("vibe-app-builder");
    setActiveSurface("agents");
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

  function handleDockSelectAgent(agentId: string) {
    setActiveTerminalId(agentId);
    // Focus mode: CSS visibility handles switching with no remount.
    // Grid mode: select agent and scroll pane into view if registered.
    if (viewMode === "grid") {
      const el = paneRefsMap.current.get(agentId);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function handleCreate(form: {
    label: string; command: string; cwd: string; dinoId: string; agentKind: AgentKind;
    initialAttachments?: TerminalAttachment[];
  }) {
    const cwdResolution = resolveAgentCwd({
      selectedProjectRoot: currentProject?.rootPath,
      requestedCwd: currentProject?.rootPath && !pathsEqual(form.cwd, currentProject.rootPath)
        ? form.cwd
        : null,
      fallbackCwd: form.cwd || DEFAULT_FALLBACK_AGENT_CWD,
    });
    const id = addAgent(
      {
        label:         form.label,
        dinoId:        form.dinoId,
        launchCommand: form.command || undefined,
        cwd:           cwdResolution.cwd,
        agentKind:     form.agentKind,
      },
      false,
      form.initialAttachments ?? [],
    );
    if (id) {
      setActiveTerminalId(id);
      setActiveSurface("agents");
      appendEvent({ id: crypto.randomUUID(), ts: Date.now(), workspaceId: workspaceName,
        agentConfigId: "", agentLabel: form.label, type: "agent_created", payload: {} });
      if (cwdResolution.warning) {
        setExportNotice(cwdResolution.warning);
        setTimeout(() => setExportNotice(null), 5000);
      }
    }
    setShowModal(false);
  }

  function handleSubmitChatTask(text: string) {
    if (!selectedTeam) {
      appendChatMessage(createSystemStatusMessage(
        "Choose an Agent Workspace team before staging a workflow. No prompts were sent.",
      ));
      return;
    }
    const run = startRun({
      userTask: text,
      projectWorkspaceId: currentProject?.id,
      agentTeamId: selectedTeam.id,
      steps: workflowStepsFromAgentTeam(selectedTeam),
    });

    appendChatMessage(createUserTaskMessage({
      text,
      projectWorkspaceId: currentProject?.id,
      agentTeamId: selectedTeam.id,
    }));
    appendChatMessage(createSystemStatusMessage(
      `Workflow run created with ${selectedTeam.name} in checkpoint mode. No prompts were sent to terminals.`,
    ));
    const firstStep = run.steps[0];
    appendChatMessage(createWorkflowProgressMessage({
      workflowRunId: run.id,
      title: firstStep ? `First checkpoint ready: ${firstStep.label}` : "Workflow run has no steps",
      detail: firstStep
        ? "Copy the step prompt or bind a running Agent Workspace agent when you are ready. CMDino will wait for your explicit action."
        : "Choose an agent team with steps before running an orchestrated workflow.",
      }));
  }

  async function handleSendWorkflowPromptToAgent(input: {
    agentId: string;
    prompt: string;
  }): Promise<{ ok: boolean; message: string }> {
    const target = agents.find((agent) => agent.id === input.agentId);
    const currentStep = currentRun?.currentStepId
      ? currentRun.steps.find((step) => step.id === currentRun.currentStepId)
      : null;

    if (!currentRun || !currentStep) {
      return { ok: false, message: "No current workflow step is ready to send." };
    }

    if (!target || !runningAgentIds.has(target.id)) {
      const message = "Could not send prompt. Target agent is not running.";
      const intervention = createWorkflowIntervention({
        kind: "needs_user_input",
        title: "Start target agent before sending",
        message,
        workflowRunId: currentRun.id,
        stepId: currentStep.id,
        agentId: target?.id,
      });
      addIntervention(intervention);
      appendChatMessage(createInterventionRequiredMessage({
        interventionId: intervention.id,
        title: intervention.title,
        message: intervention.message,
        targetAgentId: target?.id,
        targetStepId: currentStep.id,
      }));
      return { ok: false, message };
    }

    // CWD mismatch: warn but do not block send.
    if (detectCwdMismatch(target.cwd, currentProject?.rootPath)) {
      appendChatMessage(createSystemStatusMessage(
        `Warning: ${target.label} is running in "${target.cwd ?? "unknown directory"}" but selected project is "${currentProject?.rootPath}". For best results, restart the agent with the project folder as its working directory.`,
      ));
    }

    try {
      // File-based prompt handoff avoids multi-line TUI paste fragmentation in
      // interactive Claude/Codex sessions. The full prompt is written to a file;
      // a single-line instruction is sent to the terminal instead.
      if (!isTauri || !currentProject?.rootPath) {
        const message = "Prompt file handoff requires the desktop app and a selected project. Use Copy Prompt as the manual fallback.";
        appendChatMessage(createSystemStatusMessage(message));
        return { ok: false, message };
      }

      const relPath = `.cmdino/runs/${currentRun.id}/${currentStep.id}-prompt.md`;
      let filePath: string;
      try {
        filePath = await writePromptFile(currentProject.rootPath, relPath, input.prompt);
      } catch (err) {
        const message = `Could not write prompt file. Use Copy Prompt as the manual fallback. ${err instanceof Error ? err.message : String(err)}`;
        appendChatMessage(createSystemStatusMessage(message));
        return { ok: false, message };
      }

      const terminalInstruction = buildPromptFileInstruction(filePath);

      await terminalBridge.submitLine(target.id, terminalInstruction, getTerminalSubmitStrategy(target.agentKind));
      markCurrentStepPromptSent({
        agentId: target.id,
        prompt: input.prompt,
      });
      setActiveTerminalId(target.id);
      const diagnostics = [
        `Prompt file written: ${relPath}`,
        `Instruction sent to: ${target.label}`,
        "Submit sequence: text write, short delay, Enter write.",
        "Waiting for CMDINO_RESULT...",
        "Fallback: if CMDino cannot detect CMDINO_RESULT, use Capture Result From Agent or paste the result manually.",
      ].join("\n");
      appendChatMessage(createWorkflowProgressMessage({
        workflowRunId: currentRun.id,
        title: `Sent ${currentStep.label} prompt to ${target.label}`,
        detail: diagnostics,
      }));
      return {
        ok: true,
        message: `Sent ${currentStep.label} prompt to ${target.label}.\n${diagnostics}`,
      };
    } catch (err) {
      const message = `Could not send prompt. ${err instanceof Error ? err.message : String(err)}`;
      const intervention = createWorkflowIntervention({
        kind: "runtime_error",
        title: "Workflow prompt send failed",
        message,
        workflowRunId: currentRun.id,
        stepId: currentStep.id,
        agentId: target.id,
      });
      addIntervention(intervention);
      appendChatMessage(createInterventionRequiredMessage({
        interventionId: intervention.id,
        title: intervention.title,
        message: intervention.message,
        targetAgentId: target.id,
        targetStepId: currentStep.id,
      }));
      return { ok: false, message };
    }
  }

  function handleCaptureWorkflowResultFromAgent(input: {
    agentId: string;
  }): {
    ok: true;
    text: string;
    rawCapturedOutput: string;
    cleanedCapturedOutput: string;
    message: string;
    source: WorkflowResultCapture["source"];
    agentLabel: string;
  } | { ok: false; message: string } {
    const target = agents.find((agent) => agent.id === input.agentId);
    const captureGetter = workflowResultCaptureRef.current.get(input.agentId);
    const failureReason = getWorkflowResultCaptureFailureReason({
      agentId: target?.id,
      isRunning: target ? runningAgentIds.has(target.id) : false,
      hasCaptureGetter: Boolean(captureGetter),
    });

    if (failureReason) {
      return {
        ok: false,
        message: captureFailureMessage(failureReason, target?.label),
    };
  }

    try {
      // Uses TerminalPane's registered capture callback, which prefers selected
      // xterm text and otherwise reads the latest clean output block.
      const capture = normalizeWorkflowResultCapture(captureGetter?.() ?? {
        text: "",
        source: "latest_output",
      });
      const text = capture.cleanedCapturedOutput;
      if (!text.trim()) {
        return {
          ok: false,
          message: captureFailureMessage("no_output", target?.label),
        };
      }
      const sourceLabel = capture.source === "selected_text" ? "selected terminal text" : "latest clean output block";
      appendChatMessage(createWorkflowProgressMessage({
        workflowRunId: currentRun?.id,
        title: `Captured result from ${target?.label ?? input.agentId}`,
        detail: `Source: ${sourceLabel}. Review the captured output, then parse CMDINO_RESULT when ready.`,
      }));
      return {
        ok: true,
        text,
        rawCapturedOutput: capture.rawCapturedOutput,
        cleanedCapturedOutput: capture.cleanedCapturedOutput,
        source: capture.source,
        agentLabel: target?.label ?? input.agentId,
        message: `Captured from ${target?.label ?? input.agentId} using ${sourceLabel}. Review the textarea before parsing.`,
      };
    } catch {
      return {
        ok: false,
        message: captureFailureMessage("capture_failed", target?.label),
      };
    }
  }

  async function handleSendContextTextOnce(agentId: string, content: string): Promise<void> {
    const target = agents.find((agent) => agent.id === agentId);
    if (!target || !runningAgentIds.has(target.id)) {
      throw new Error("Select a running target agent before using Send Into Agent Once.");
    }
    await terminalBridge.submitLine(target.id, content, getTerminalSubmitStrategy(target.agentKind));
    setActiveTerminalId(target.id);
  }

  async function handleSendWorkflowResultCorrectionToAgent(input: {
    agentId: string;
  }): Promise<{ ok: boolean; message: string }> {
    const target = agents.find((agent) => agent.id === input.agentId);
    if (!target || !runningAgentIds.has(target.id)) {
      return {
        ok: false,
        message: "Start the target agent before sending the correction instruction.",
      };
    }
    const instruction = buildWorkflowResultCorrectionInstruction();
    try {
      await terminalBridge.submitLine(target.id, instruction, getTerminalSubmitStrategy(target.agentKind));
      setActiveTerminalId(target.id);
      return {
        ok: true,
        message: `Asked ${target.label} to finish with CMDINO_RESULT_START / CMDINO_RESULT_END.`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Could not send correction instruction. ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  function handleParseWorkflowResult(text: string) {
    const parsed = completeCurrentStepFromText(text);
    if (!parsed.ok) {
      const detail =
        parsed.reason === "missing_block"
          ? "Missing CMDINO_RESULT_START / CMDINO_RESULT_END block. Ask the agent to finish with the structured result block, then capture or paste again."
          : parsed.reason === "invalid_json"
            ? "CMDino found a result block, but the JSON inside it is invalid. Ask the agent to resend valid JSON inside CMDINO_RESULT_START / CMDINO_RESULT_END."
            : "CMDino found a result block, but the JSON shape was invalid. Required fields: status, summary, artifacts, handoff, next.";
      appendChatMessage(createSystemStatusMessage(
        `Could not parse CMDINO_RESULT: ${detail}`,
      ));
      return parsed;
    }

    if (parsed.result.status === "success") {
      appendChatMessage(createWorkflowProgressMessage({
        workflowRunId: currentRun?.id,
        title: "Checkpoint completed",
        detail: parsed.result.summary,
      }));
    } else if (parsed.result.status === "needs_user_action") {
      const intervention = createWorkflowIntervention({
        kind: "needs_user_input",
        title: "Workflow needs user action",
        message: parsed.result.handoff.message || parsed.result.summary,
        workflowRunId: currentRun?.id,
        stepId: currentRun?.currentStepId,
      });
      addIntervention(intervention);
      appendChatMessage(createInterventionRequiredMessage({
        interventionId: intervention.id,
        title: "Workflow needs user action",
        message: intervention.message,
        targetStepId: currentRun?.currentStepId,
      }));
    } else {
      const intervention = createWorkflowIntervention({
        kind: "command_failed",
        title: "Workflow step failed",
        message: parsed.result.summary,
        workflowRunId: currentRun?.id,
        stepId: currentRun?.currentStepId,
      });
      addIntervention(intervention);
      appendChatMessage(createInterventionRequiredMessage({
        interventionId: intervention.id,
        title: intervention.title,
        message: intervention.message,
        targetStepId: currentRun?.currentStepId,
      }));
    }

    return parsed;
  }

  function handleInterventionAction(intervention: Intervention, actionKind: InterventionActionKind) {
    if (actionKind === "open_terminal") {
      setActiveSurface("agents");
      return;
    }
    if (actionKind === "open_setup_check") {
      setShowHealth(true);
      return;
    }
    if (actionKind === "mark_resolved") {
      resolveIntervention(intervention.id);
      appendChatMessage(createSystemStatusMessage(`Intervention resolved: ${intervention.title}`));
      return;
    }
    if (actionKind === "dismiss") {
      dismissIntervention(intervention.id);
      appendChatMessage(createSystemStatusMessage(`Intervention dismissed: ${intervention.title}`));
    }
  }

  function handleContinueWorkflow() {
    if (!currentRun?.currentStepId) return;
    const currentIndex = currentRun.steps.findIndex((step) => step.id === currentRun.currentStepId);
    const currentStep = currentRun.steps[currentIndex];
    const parsed = currentStep?.parsedOutput as Record<string, unknown> | undefined;
    if (
      currentStep?.status !== "completed" ||
      parsed?.status !== "success" ||
      !Array.isArray(parsed.artifacts) ||
      !Array.isArray(parsed.next)
    ) {
      appendChatMessage(createSystemStatusMessage(
        "Parse a valid CMDINO_RESULT before continuing to the next checkpoint.",
      ));
      return;
    }
    const nextStep = currentRun.steps.slice(currentIndex + 1).find((step) => step.status === "pending");
    const finalMarkdown = buildWorkflowFinalSummary(currentRun);
    continueToNextStep();

    if (nextStep) {
      appendChatMessage(createWorkflowProgressMessage({
        workflowRunId: currentRun.id,
        title: `Next checkpoint ready: ${nextStep.label}`,
        detail: `${currentStep?.label ?? "Previous step"} handoff is included in the next prompt. No prompt was sent automatically.`,
      }));
    } else {
      appendChatMessage({
        id: crypto.randomUUID(),
        kind: "final_output",
        createdAt: Date.now(),
        markdown: finalMarkdown,
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  async function saveWorkflowArtifact(
    build: typeof buildWorkflowFinalOutputArtifact,
    successLabel: string,
  ): Promise<{ ok: boolean; message: string }> {
    if (!currentRun) return { ok: false, message: "No workflow run is available to save." };
    if (!isTauri) return { ok: false, message: "Saving workflow artifacts requires the desktop app." };
    try {
      const artifact = build(currentRun);
      // Reuses the existing Output Shelf write path used by Memory Briefs and
      // Build-in-Public exports; no parallel output system or Rust changes.
      const result = await writeOutputFiles([{ fileName: artifact.fileName, content: artifact.content }]);
      addWorkflowRunArtifactPaths(currentRun.id, result.files);
      await refreshOutputFiles();
      setExportNotice(`${successLabel} saved to Output Shelf`);
      setTimeout(() => setExportNotice(null), 4000);
      return { ok: true, message: `${successLabel} saved to Output Shelf.` };
    } catch (err) {
      return {
        ok: false,
        message: `Could not save ${successLabel.toLowerCase()}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  function handleSaveWorkflowFinalOutput() {
    return saveWorkflowArtifact(buildWorkflowFinalOutputArtifact, "Workflow final output");
  }

  function handleSaveWorkflowStepArtifacts() {
    return saveWorkflowArtifact(buildWorkflowStepArtifacts, "Workflow step artifacts");
  }

  function handleGenerateBuildPublicKit() {
    return saveWorkflowArtifact(buildWorkflowBuildPublicKitArtifact, "Build-in-Public kit");
  }

  async function handleGenerateMemoryBriefsForWorkflow(): Promise<{ ok: boolean; message: string }> {
    if (!isTauri) return { ok: false, message: "Memory brief export requires the desktop app." };
    try {
      const briefs = buildMemoryBriefs({
        workspaceName,
        agents,
        workflowLinks,
        sessionEntries,
        currentRun,
        outputFiles,
        workflowArtifactPaths: currentRun
          ? workflowRunHistoryEntries.find((entry) => entry.id === currentRun.id)?.artifactPaths ?? []
          : [],
        generatedAt: Date.now(),
      });
      const result = await writeMemoryBriefs(briefs);
      if (currentRun && result.files.length > 0) {
        addWorkflowRunArtifactPaths(currentRun.id, result.files);
      }
      void refreshOutputFiles();
      return {
        ok: true,
        message: `Generated ${result.count} memory brief${result.count === 1 ? "" : "s"} saved to Output Shelf.`,
      };
    } catch (err) {
      return {
        ok: false,
        message: `Memory brief generation failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  function handleResumeWorkflowRun(entry: WorkflowRunHistoryEntry): { ok: boolean; message: string } {
    if (!isWorkflowRunResumable(entry)) {
      return { ok: false, message: "This workflow run is complete, failed, or cancelled, so it can only be inspected." };
    }

    if (entry.projectWorkspaceId) {
      if (!currentProject) {
        return { ok: false, message: "Open the matching project before resuming this workflow run." };
      }
      if (currentProject.id !== entry.projectWorkspaceId) {
        return { ok: false, message: "This run belongs to a different project. Open that project before resuming." };
      }
    }

    const hasActiveIncompleteRun = Boolean(
      currentRun &&
      currentRun.id !== entry.id &&
      !["completed", "failed", "cancelled"].includes(currentRun.status),
    );

    restoreRun(entry.run);
    setActiveSurface("chat");
    setShowWorkflowHistory(false);

    const notices: string[] = [
      `Resumed: ${entry.userTask}.`,
      "No prompt was sent automatically.",
    ];
    if (hasActiveIncompleteRun) {
      notices.push("Previous incomplete run was replaced.");
    }
    if (runningAgentIds.size > 0) {
      notices.push(`${runningAgentIds.size} agent${runningAgentIds.size !== 1 ? "s" : ""} still running — check their output before sending the next prompt.`);
    }

    appendChatMessage(createSystemStatusMessage(notices.join(" ")));
    return { ok: true, message: "Resumed in Chat. Continue manually from the current checkpoint." };
  }

  function isAgentTeamDeployed(teamId?: string | null): boolean {
    if (!teamId) return false;
    const team = agentTeams.find((item) => item.id === teamId);
    if (!team) return false;
    return team.steps.every((step) => agents.some((agent) =>
      agent.configId === `team-${team.id}-${step.id}` ||
      (
        agent.agentKind === step.preferredProvider &&
        agent.label.toLowerCase().includes(step.role.replace(/_/g, " ").split(" ")[0])
      )
    ));
  }

  const showProjectOpenScreen = count === 0 && !currentProject && !projectEntryDismissed;
  const currentWorkflowTeam = currentRun?.agentTeamId
    ? agentTeams.find((team) => team.id === currentRun.agentTeamId) ?? selectedTeam
    : selectedTeam;
  const selectedTeamDeployed = isAgentTeamDeployed(currentWorkflowTeam?.id);
  const currentStep = currentRun?.currentStepId
    ? currentRun.steps.find((step) => step.id === currentRun.currentStepId) ?? null
    : null;
  const currentStepIndex = currentRun && currentStep
    ? currentRun.steps.findIndex((step) => step.id === currentStep.id)
    : -1;
  const previousCompletedStep = currentRun && currentStepIndex > 0
    ? [...currentRun.steps.slice(0, currentStepIndex)].reverse().find((step) => step.status === "completed")
    : null;
  const previousParsedOutput = previousCompletedStep?.parsedOutput as { handoff?: unknown } | undefined;
  const previousHandoff = previousParsedOutput?.handoff as { target?: unknown } | string | undefined;
  const previousHandoffTarget = typeof previousHandoff === "string"
    ? previousHandoff
    : typeof previousHandoff?.target === "string"
      ? previousHandoff.target
      : undefined;
  const suggestedWorkflowTargetId = currentStep ? suggestTargetAgentForStep({
    preferredProvider: currentStep.preferredProvider,
    role: currentStep.agentRole,
    handoffTarget: previousHandoffTarget,
    agents: agents.map((agent) => ({
      id: agent.id,
      label: agent.label,
      kind: agent.agentKind,
      isRunning: runningAgentIds.has(agent.id),
    })),
  }) : null;
  const workflowPromptAgentTargets = buildWorkflowPromptAgentTargets(
    agents,
    runningAgentIds,
    lifecycleByAgentId,
    suggestedWorkflowTargetId,
  );
  const contextTargetAgent = agents.find((agent) =>
    agent.id === (currentStep?.agentId ?? suggestedWorkflowTargetId)
  );
  const currentStepPrompt = buildPromptForCurrentStep({
    projectName: currentProject?.name,
    projectPath: currentProject?.rootPath,
    agentTeamName: currentWorkflowTeam?.name,
    contextReferences: selectContextReferences(contextManifest, {
      agentId: contextTargetAgent?.id,
      agentLabel: contextTargetAgent?.label,
    }),
  });

  return (
    <div className="app-shell" data-theme={settings.themeMode}>

      {/* Left sidebar */}
      <AppSidebar
        onOpenChat={() => { setProjectEntryDismissed(true); setActiveSurface("chat"); }}
        onOpenAgents={() => setActiveSurface("agents")}
        onAddTerminal={() => setShowModal(true)}
        onLoadDemo={loadDemoWorkspace}
        onOpenWorkflow={() => setShowWorkflow(true)}
        onOpenContextLibrary={() => setShowContextLibrary(true)}
        onOpenWorkflowHistory={() => setShowWorkflowHistory(true)}
        onOpenHealth={() => setShowHealth(true)}
        onNew={handleNew}
        onSave={() => { void handleSave(); }}
        onRefreshList={() => { void refreshList(); }}
        onOpenWorkspaceBrowser={() => setShowWorkspaceBrowser(true)}
        savedWorkspaces={savedWorkspaces}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        onStartAll={() => { void handleStartAll(); }}
        onGenerateMemoryBriefs={() => { void handleGenerateMemoryBriefs(); }}
        canGenerateMemoryBrief={agents.length > 0 || Boolean(currentRun) || sessionEntries.length > 0 || outputFiles.length > 0}
        onExportTranscripts={() => { void handleExportTranscripts(); }}
        onGenerateBuildUpdateKit={() => { void handleGenerateBuildUpdateKit(); }}
        canGenerateBuildKit={agents.length > 0 || sessionEntries.length > 0}
        onOpenOutputLibrary={() => setShowOutputLibrary(true)}
        outputFileCount={outputFiles.length}
        terminalCount={count}
        maxTerminals={MAX_TERMINALS}
        maxReached={maxReached}
        healthSnapshot={healthSnapshot}
        activeSurface={activeSurface}
        openInterventionCount={openInterventionCount}
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
          currentProject={currentProject}
          onOpenProject={() => { void handleSelectProjectFolder(); }}
          onClearProject={clearCurrentProject}
        />

        <section className="workspace-body">
          {showProjectOpenScreen ? (
            <ProjectOpenScreen
              recentProjects={recentProjects}
              onSelectFolder={() => { void handleSelectProjectFolder(); }}
              onOpenRecent={handleOpenRecentProject}
              onRemoveRecent={removeRecentProject}
              onContinueWithoutProject={() => setProjectEntryDismissed(true)}
            />
          ) : (
            <>
              <div
                className="workspace-surface"
                data-active={String(activeSurface === "chat")}
                aria-hidden={activeSurface !== "chat"}
              >
                <MainTaskChat
                  projectName={currentProject?.name}
                  projectPath={currentProject?.rootPath}
                  agentTeamName={currentWorkflowTeam?.name}
                  agentTeams={agentTeams}
                  selectedAgentTeamId={currentRun?.agentTeamId ?? selectedTeamId}
                  onSelectAgentTeam={handleChooseSharedTeam}
                  messages={chatMessages}
                  interventions={interventions}
                  openInterventions={openInterventions}
                  currentRun={currentRun}
                  currentStepPrompt={currentStepPrompt}
                  workflowAgentTargets={workflowPromptAgentTargets}
                  onSubmitTask={handleSubmitChatTask}
                  selectedTeamDeployed={selectedTeamDeployed}
                  onDeploySelectedTeam={handleDeploySelectedTeam}
                  onSendWorkflowPromptToAgent={handleSendWorkflowPromptToAgent}
                  onCaptureWorkflowResultFromAgent={handleCaptureWorkflowResultFromAgent}
                  onSendWorkflowResultCorrectionToAgent={handleSendWorkflowResultCorrectionToAgent}
                  onSaveWorkflowFinalOutput={handleSaveWorkflowFinalOutput}
                  onSaveWorkflowStepArtifacts={handleSaveWorkflowStepArtifacts}
                  onGenerateBuildPublicKit={handleGenerateBuildPublicKit}
                  onGenerateMemoryBriefs={handleGenerateMemoryBriefsForWorkflow}
                  onParseResult={handleParseWorkflowResult}
                  onContinueWorkflow={handleContinueWorkflow}
                  onCancelWorkflow={cancelRun}
                  onClear={clearChatMessages}
                  onOpenAgents={() => setActiveSurface("agents")}
                  onOpenProject={() => { void handleSelectProjectFolder(); }}
                  onOpenContextLibrary={() => setShowContextLibrary(true)}
                  onOpenSetupCheck={() => setShowHealth(true)}
                  onInterventionAction={handleInterventionAction}
                  pendingAgentInteractions={pendingAgentInteractions}
                  onOpenAgentTerminal={handleOpenAgentTerminal}
                  onSendInteractionResponse={handleSendInteractionResponse}
                  onDismissInteraction={dismissAgentInteraction}
                />
              </div>
              <div
                className="workspace-surface"
                data-active={String(activeSurface === "agents")}
                aria-hidden={activeSurface !== "agents"}
              >
                {count === 0 ? (
                  <EmptyWorkspaceState
                    maxTerminals={MAX_TERMINALS}
                    onDeployAgent={() => setShowModal(true)}
                    onLoadDemo={loadDemoWorkspace}
                    onLoadTemplate={() => setShowTemplatePicker(true)}
                    selectedTeamName={selectedTeam?.name}
                    selectedTeamSteps={selectedTeam?.steps.map((step) => step.label)}
                    onDeploySelectedTeam={handleDeploySelectedTeam}
                    lastSession={lastSession}
                    outputFiles={outputFiles}
                    onViewOutputs={outputFiles.length > 0 ? () => setShowOutputLibrary(true) : undefined}
                    onLoadLastWorkspace={
                      lastSession
                        ? async () => { await handleLoad(lastSession.workspaceSlug); }
                        : undefined
                    }
                  />
                ) : (
                  <TerminalGrid
                    agents={agents}
                    selectedProjectRoot={currentProject?.rootPath}
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
                    activeTerminalId={activeTerminalId}
                    onFocusPane={handleFocusPane}
                    workflowLinks={workflowLinks}
                    onFocusTarget={handleFocusTarget}
                    lifecycleByAgentId={lifecycleByAgentId}
                    readinessErrors={readinessErrors}
                    onReadinessError={handleReadinessError}
                    onEvent={appendEvent}
                    sessionEntries={sessionEntries}
                    healthSnapshot={healthSnapshot}
                    onDockSelectAgent={handleDockSelectAgent}
                    onRegisterTranscriptGetter={handleRegisterTranscriptGetter}
                    onRegisterWorkflowResultCapture={handleRegisterWorkflowResultCapture}
                    generatedOutputFiles={outputFiles}
                    onRefreshGeneratedOutputs={() => { void refreshOutputFiles(); }}
                    onRegisterPaneRef={handleRegisterPaneRef}
                    onOpenHealth={() => setShowHealth(true)}
                    onContextManifestChange={setContextManifest}
                    onInteractionDetected={handleInteractionDetected}
                    pendingInteractionsByAgentId={
                      pendingAgentInteractions.reduce<Record<string, number>>((acc, i) => {
                        acc[i.agentId] = (acc[i.agentId] ?? 0) + 1;
                        return acc;
                      }, {})
                    }
                  />
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {/* Agent creation modal */}
      {showModal && (
        <AgentCreationModal
          onConfirm={handleCreate}
          onCancel={() => setShowModal(false)}
          providerHealth={healthSnapshot}
          defaultCwd={currentProject?.rootPath}
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

      {/* First-launch setup screen — only when no agents are loaded */}
      {!settings.onboardingDismissed && count === 0 && !showProjectOpenScreen && activeSurface === "agents" && (
        <WelcomeModal
          onDismiss={(dontShow) => updateSettings({ onboardingDismissed: dontShow })}
          onLoadDemo={() => {
            loadDemoWorkspace();
            updateSettings({ onboardingDismissed: true });
          }}
          onDeployAgent={() => setShowModal(true)}
          onLoadTemplate={() => setShowTemplatePicker(true)}
          providerHealth={healthSnapshot}
          onOpenHealth={() => setShowHealth(true)}
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

      {showWorkflowHistory && (
        <WorkflowRunHistoryPanel
          entries={workflowRunHistoryEntries}
          currentProjectId={currentProject?.id}
          currentAgentTeamId={selectedTeamId}
          hasRunningAgents={runningAgentIds.size > 0}
          onResumeRun={handleResumeWorkflowRun}
          onOpenOutputLibrary={() => {
            setShowOutputLibrary(true);
          }}
          onClose={() => setShowWorkflowHistory(false)}
        />
      )}

      {/* Template picker overlay */}
      {showTemplatePicker && (
        <TemplatePickerModal
          onSelect={handleLoadTemplate}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {showWorkspaceBrowser && (
        <SavedWorkspaceBrowser
          savedWorkspaces={savedWorkspaces}
          onRefresh={() => { void refreshList(); }}
          onOpen={(name) => {
            setShowWorkspaceBrowser(false);
            void handleLoad(name);
          }}
          onDelete={handleDeleteWorkspace}
          onClose={() => setShowWorkspaceBrowser(false)}
        />
      )}

      {showContextLibrary && (
        <ContextLibraryModal
          agent={agents[0]}
          allAgents={agents}
          projectRoot={currentProject?.rootPath}
          runningAgentIds={runningAgentIds}
          defaultSendTargetAgentId={agents.find((agent) => runningAgentIds.has(agent.id))?.id}
          onSendTextOnce={handleSendContextTextOnce}
          onClose={() => setShowContextLibrary(false)}
          onManifestChange={setContextManifest}
        />
      )}

      {/* Output Library drawer */}
      {showOutputLibrary && (
        <OutputLibraryDrawer
          outputFiles={outputFiles}
          agents={agents}
          activeTerminalId={activeTerminalId}
          workflowRunEntries={workflowRunHistoryEntries}
          onAttach={addAttachment}
          onRefresh={() => { void refreshOutputFiles(); }}
          onClose={() => setShowOutputLibrary(false)}
        />
      )}

      {/* Confirmation dialog */}
      {confirmDialog && (
        <ConfirmDialog
          title={confirmDialog.title}
          body={confirmDialog.body}
          confirmLabel={confirmDialog.confirmLabel}
          secondaryLabel={confirmDialog.secondaryLabel}
          destructive={confirmDialog.destructive}
          onConfirm={confirmDialog.onConfirm}
          onSecondary={confirmDialog.onSecondary}
          onCancel={() => setConfirmDialog(null)}
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
