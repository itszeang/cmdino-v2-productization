import { useCallback, useEffect, useRef, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { CmdinoWorkspaceFile } from "../domain/workspace";
import { WORKSPACE_SCHEMA_VERSION } from "../domain/workspace";
import type { TerminalAttachment } from "../domain/orchestration";
import { attachmentKindFromPath } from "../domain/orchestration";

export const MAX_TERMINALS = 12;

// callers don't provide id, configId, or attachments — generated here
type NewAgent = Omit<TerminalAgent, "id" | "configId" | "attachments">;

export function useTerminalAgents() {
  const [agents,          setAgents]          = useState<TerminalAgent[]>([]);
  const [workspaceName,   setWorkspaceName]   = useState("Untitled Workspace");
  const [runningAgentIds, setRunningAgentIds] = useState<Set<string>>(new Set());

  const agentsRef = useRef<TerminalAgent[]>(agents);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  // ── Agent CRUD ────────────────────────────────────────────────────────────

  const addAgent = useCallback((newAgent: NewAgent, autoStart = true) => {
    if (agentsRef.current.length >= MAX_TERMINALS) return;
    const id = crypto.randomUUID();
    const full: TerminalAgent = {
      configId:    crypto.randomUUID(),
      attachments: [],
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
  }, []);

  const removeAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
    setRunningAgentIds((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }, []);

  // ── Attachment management ─────────────────────────────────────────────────

  const addAttachment = useCallback((agentId: string, path: string) => {
    if (!attachmentKindFromPath(path)) return; // only .md/.txt
    const fileName = path.split(/[/\\]/).pop() ?? path;
    const att: TerminalAttachment = {
      id:       crypto.randomUUID(),
      path,
      fileName,
      addedAt:  Date.now(),
    };
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId ? { ...a, attachments: [...a.attachments, att] } : a
      )
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
    setRunningAgentIds(new Set()); // all dormant — user starts manually
    setWorkspaceName(workspace.workspaceName);
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
    };
  }, [workspaceName]);

  return {
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
    count:      agents.length,
    maxReached: agents.length >= MAX_TERMINALS,
  };
}
