import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { CmdinoWorkspaceFile } from "../domain/workspace";
import { WORKSPACE_SCHEMA_VERSION } from "../domain/workspace";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import type { AgentKind } from "../domain/agentKind";
import type { WorkflowLink, WorkflowLinkKind, WorkflowNodePosition, WorkflowNodePositions } from "../domain/workflow";

export interface AgentConfigUpdate {
  label:          string;
  dinoId:         string;
  launchCommand?: string;
  cwd?:           string;
  agentKind:      AgentKind;
  attachments:    TerminalAttachment[];
}
import {
  upsertWorkflowLink,
  upsertWorkflowRoute,
  removeWorkflowLink  as wfRemoveLink,
  removeLinksForConfigId,
  sanitizeWorkflowLinks,
  sanitizeWorkflowNodePositions,
  removeWorkflowNodePosition,
} from "../domain/workflow";

export const MAX_TERMINALS = 12;

type NewAgent = Omit<TerminalAgent, "id" | "configId" | "attachments">;

function dedupAttachments(atts: TerminalAttachment[]): TerminalAttachment[] {
  const seen = new Set<string>();
  return atts.filter((a) => {
    if (seen.has(a.path)) return false;
    seen.add(a.path);
    return true;
  });
}

export function useTerminalAgents() {
  const [agents,                 setAgents]                 = useState<TerminalAgent[]>([]);
  const [workspaceName,          setWorkspaceName]          = useState("Untitled Workspace");
  const [runningAgentIds,        setRunningAgentIds]        = useState<Set<string>>(new Set());
  const [workflowLinks,          setWorkflowLinks]          = useState<WorkflowLink[]>([]);
  const [workflowNodePositions,  setWorkflowNodePositions]  = useState<WorkflowNodePositions>({});

  const agentsRef                = useRef<TerminalAgent[]>(agents);
  const workflowLinksRef         = useRef<WorkflowLink[]>(workflowLinks);
  const workflowNodePositionsRef = useRef<WorkflowNodePositions>(workflowNodePositions);

  useEffect(() => { agentsRef.current               = agents;               }, [agents]);
  useEffect(() => { workflowLinksRef.current         = workflowLinks;        }, [workflowLinks]);
  useEffect(() => { workflowNodePositionsRef.current = workflowNodePositions; }, [workflowNodePositions]);

  // ── Agent CRUD ────────────────────────────────────────────────────────────

  const addAgent = useCallback((
    newAgent:           NewAgent,
    autoStart           = true,
    initialAttachments: TerminalAttachment[] = [],
  ): string | null => {
    if (agentsRef.current.length >= MAX_TERMINALS) return null;
    const id = crypto.randomUUID();
    const full: TerminalAgent = {
      configId:    crypto.randomUUID(),
      attachments: dedupAttachments(initialAttachments),
      ...newAgent,
      id,
    };
    setAgents((prev) => {
      if (prev.length >= MAX_TERMINALS) return prev;
      return [...prev, full];
    });
    if (autoStart) {
      setRunningAgentIds((ids) => new Set([...ids, id]));
    }
    return id;
  }, []);

  const updateAgent = useCallback((agentId: string, update: AgentConfigUpdate) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id !== agentId ? a : {
          ...a,
          label:         update.label.trim() || a.label,
          dinoId:        update.dinoId,
          launchCommand: update.launchCommand?.trim() || undefined,
          cwd:           update.cwd?.trim()           || undefined,
          agentKind:     update.agentKind,
          attachments:   dedupAttachments(update.attachments),
        }
      )
    );
  }, []);

  const removeAgent = useCallback((id: string) => {
    const agent = agentsRef.current.find((a) => a.id === id);
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setRunningAgentIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (agent?.configId) {
      setWorkflowLinks((prev) => removeLinksForConfigId(prev, agent.configId));
      setWorkflowNodePositions((prev) => removeWorkflowNodePosition(prev, agent.configId));
    }
  }, []);

  // ── Attachment management ─────────────────────────────────────────────────

  const addAttachment = useCallback((
    agentId: string,
    path:    string,
    source:  "user" | "preset" | "generated" = "user",
  ) => {
    if (!attachmentKindFromPath(path)) return;
    const fileName = path.split(/[/\\]/).pop() ?? path;
    const att: TerminalAttachment = {
      id:      crypto.randomUUID(),
      path,
      fileName,
      addedAt: Date.now(),
      source,
    };
    setAgents((prev) =>
      prev.map((a) => {
        if (a.id !== agentId) return a;
        if (a.attachments.some((x) => x.path === path)) return a; // dedup
        return { ...a, attachments: [...a.attachments, att] };
      })
    );
  }, []);

  const removeAttachment = useCallback((agentId: string, attachmentId: string) => {
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, attachments: a.attachments.filter((att) => att.id !== attachmentId) }
          : a
      )
    );
  }, []);

  // ── Workflow links ────────────────────────────────────────────────────────

  const recordWorkflowLink = useCallback((
    sourceAgentId: string,
    targetAgentId: string,
    kind:          WorkflowLinkKind,
  ) => {
    const agents = agentsRef.current;
    const src    = agents.find((a) => a.id === sourceAgentId);
    const tgt    = agents.find((a) => a.id === targetAgentId);
    if (!src?.configId || !tgt?.configId || src.configId === tgt.configId) return;
    setWorkflowLinks((prev) =>
      upsertWorkflowLink(prev, src.configId, tgt.configId, kind)
    );
  }, []);

  const removeWorkflowLink = useCallback((id: string) => {
    setWorkflowLinks((prev) => wfRemoveLink(prev, id));
  }, []);

  const updateWorkflowNodePosition = useCallback((configId: string, position: WorkflowNodePosition) => {
    setWorkflowNodePositions((prev) => ({ ...prev, [configId]: position }));
  }, []);

  const resetWorkflowLayout = useCallback(() => {
    setWorkflowNodePositions({});
  }, []);

  const createWorkflowRoute = useCallback((sourceConfigId: string, targetConfigId: string) => {
    if (sourceConfigId === targetConfigId) return;
    setWorkflowLinks((prev) => upsertWorkflowRoute(prev, sourceConfigId, targetConfigId));
  }, []);

  // ── Lifecycle control ─────────────────────────────────────────────────────

  const startAgent = useCallback((id: string) => {
    setRunningAgentIds((ids) => new Set([...ids, id]));
  }, []);

  const startAll = useCallback(() => {
    setRunningAgentIds(new Set(agentsRef.current.map((a) => a.id)));
  }, []);

  // ── Workspace operations ──────────────────────────────────────────────────

  const resetWorkspace = useCallback((name = "Untitled Workspace") => {
    setAgents([]);
    setRunningAgentIds(new Set());
    setWorkflowLinks([]);
    setWorkflowNodePositions({});
    setWorkspaceName(name);
  }, []);

  const loadWorkspaceConfig = useCallback((workspace: CmdinoWorkspaceFile) => {
    const sorted = [...workspace.terminals].sort((a, b) => a.order - b.order);
    const newAgents: TerminalAgent[] = sorted.map((t) => ({
      id:          crypto.randomUUID(),
      configId:    t.configId,
      label:       t.label,
      dinoId:      t.dinoId,
      launchCommand: t.launchCommand,
      cwd:         t.cwd,
      agentKind:   t.agentKind,
      attachments: t.attachments.map((pa) => ({
        id:       pa.id,
        path:     pa.path,
        fileName: pa.fileName,
        addedAt:  Date.now(),
        source:   pa.path.startsWith("cmdino-preset://") ? "preset" as const : "user" as const,
      })),
    }));
    setAgents(newAgents);
    setRunningAgentIds(new Set());
    setWorkspaceName(workspace.workspaceName);

    // Restore workflow links — re-sanitize against loaded terminal configIds
    const validConfigIds = new Set(newAgents.map((a) => a.configId));
    const restoredLinks  = sanitizeWorkflowLinks(
      workspace.workflowLinks ?? [],
      validConfigIds,
    );
    setWorkflowLinks(restoredLinks);

    const restoredPositions = sanitizeWorkflowNodePositions(
      workspace.workflowNodePositions ?? {},
      validConfigIds,
    );
    setWorkflowNodePositions(restoredPositions);
  }, []);

  const buildWorkspaceFile = useCallback((): CmdinoWorkspaceFile => {
    return {
      schemaVersion: WORKSPACE_SCHEMA_VERSION,
      workspaceName,
      terminals: agentsRef.current.map((a, i) => ({
        configId:      a.configId,
        order:         i,
        label:         a.label,
        agentKind:     a.agentKind ?? "custom",
        launchCommand: a.launchCommand,
        cwd:           a.cwd,
        dinoId:        a.dinoId,
        attachments:   a.attachments.map(({ id, path, fileName }) => ({ id, path, fileName })),
      })),
      workflowLinks:         workflowLinksRef.current,
      workflowNodePositions: workflowNodePositionsRef.current,
    };
  }, [workspaceName]);

  return {
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
    startAll,
    resetWorkspace,
    loadWorkspaceConfig,
    buildWorkspaceFile,
    count:      agents.length,
    maxReached: agents.length >= MAX_TERMINALS,
  };
}
