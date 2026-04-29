import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { CmdinoWorkspaceFile } from "../domain/workspace";
import { WORKSPACE_SCHEMA_VERSION } from "../domain/workspace";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";
import type { WorkflowLink, WorkflowLinkKind } from "../domain/workflow";
import {
  upsertWorkflowLink,
  removeWorkflowLink  as wfRemoveLink,
  removeLinksForConfigId,
  sanitizeWorkflowLinks,
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
  const [agents,          setAgents]          = useState<TerminalAgent[]>([]);
  const [workspaceName,   setWorkspaceName]   = useState("Untitled Workspace");
  const [runningAgentIds, setRunningAgentIds] = useState<Set<string>>(new Set());
  const [workflowLinks,   setWorkflowLinks]   = useState<WorkflowLink[]>([]);

  const agentsRef       = useRef<TerminalAgent[]>(agents);
  const workflowLinksRef = useRef<WorkflowLink[]>(workflowLinks);

  useEffect(() => { agentsRef.current       = agents;        }, [agents]);
  useEffect(() => { workflowLinksRef.current = workflowLinks; }, [workflowLinks]);

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
    }
  }, []);

  // ── Attachment management ─────────────────────────────────────────────────

  const addAttachment = useCallback((agentId: string, path: string) => {
    if (!attachmentKindFromPath(path)) return;
    const fileName = path.split(/[/\\]/).pop() ?? path;
    const att: TerminalAttachment = {
      id:      crypto.randomUUID(),
      path,
      fileName,
      addedAt: Date.now(),
      source:  "user",
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
      workflowLinks: workflowLinksRef.current,
    };
  }, [workspaceName]);

  return {
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
    count:      agents.length,
    maxReached: agents.length >= MAX_TERMINALS,
  };
}
