import type { WorkflowRun, WorkflowRunStatus } from "./workflowRun";

export const WORKFLOW_RUN_HISTORY_STORAGE_KEY = "cmdino.v2.workflow_runs";
export const WORKFLOW_RUN_HISTORY_LIMIT = 50;

export interface WorkflowRunHistoryEntry {
  id: string;
  projectWorkspaceId?: string;
  projectName?: string;
  agentTeamId?: string;
  agentTeamName?: string;
  userTask: string;
  status: WorkflowRunStatus;
  stepCount: number;
  completedStepCount: number;
  createdAt: number;
  updatedAt: number;
  artifactPaths?: string[];
  run: WorkflowRun;
}

export function completedStepCount(run: WorkflowRun): number {
  return run.steps.filter((step) => step.status === "completed").length;
}

export function workflowRunStatusLabel(status: WorkflowRunStatus): string {
  const labels: Record<WorkflowRunStatus, string> = {
    idle: "Idle",
    queued: "Queued",
    running: "Running",
    paused_for_intervention: "Paused",
    waiting_for_user: "Waiting",
    completed: "Completed",
    failed: "Failed",
    cancelled: "Cancelled",
  };
  return labels[status];
}

export function isWorkflowRunResumable(entry: WorkflowRunHistoryEntry): boolean {
  return Boolean(
    entry.run.currentStepId &&
    !["completed", "failed", "cancelled"].includes(entry.status),
  );
}

export function buildWorkflowRunHistoryEntry(
  run: WorkflowRun,
  input: {
    projectName?: string;
    agentTeamName?: string;
    artifactPaths?: string[];
    updatedAt?: number;
  } = {},
): WorkflowRunHistoryEntry {
  return {
    id: run.id,
    projectWorkspaceId: run.projectWorkspaceId,
    projectName: input.projectName,
    agentTeamId: run.agentTeamId,
    agentTeamName: input.agentTeamName,
    userTask: run.userTask,
    status: run.status,
    stepCount: run.steps.length,
    completedStepCount: completedStepCount(run),
    createdAt: run.createdAt,
    updatedAt: input.updatedAt ?? Date.now(),
    artifactPaths: input.artifactPaths,
    run,
  };
}

export function sortAndCapWorkflowRunHistory(
  entries: WorkflowRunHistoryEntry[],
  limit = WORKFLOW_RUN_HISTORY_LIMIT,
): WorkflowRunHistoryEntry[] {
  return [...entries]
    .sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function upsertWorkflowRunHistoryEntry(
  entries: WorkflowRunHistoryEntry[],
  entry: WorkflowRunHistoryEntry,
  limit = WORKFLOW_RUN_HISTORY_LIMIT,
): WorkflowRunHistoryEntry[] {
  const previous = entries.find((item) => item.id === entry.id);
  const artifactPaths = [
    ...(previous?.artifactPaths ?? []),
    ...(entry.artifactPaths ?? []),
  ];
  const nextEntry = {
    ...previous,
    ...entry,
    projectName: entry.projectName ?? previous?.projectName,
    agentTeamName: entry.agentTeamName ?? previous?.agentTeamName,
    artifactPaths: artifactPaths.length > 0 ? Array.from(new Set(artifactPaths)) : undefined,
  };

  return sortAndCapWorkflowRunHistory(
    [nextEntry, ...entries.filter((item) => item.id !== entry.id)],
    limit,
  );
}

export function appendWorkflowRunArtifactPaths(
  entries: WorkflowRunHistoryEntry[],
  runId: string,
  artifactPaths: string[],
  updatedAt = Date.now(),
): WorkflowRunHistoryEntry[] {
  if (artifactPaths.length === 0) return entries;
  return sortAndCapWorkflowRunHistory(entries.map((entry) => {
    if (entry.id !== runId) return entry;
    return {
      ...entry,
      artifactPaths: Array.from(new Set([...(entry.artifactPaths ?? []), ...artifactPaths])),
      updatedAt,
    };
  }));
}

export function prioritizeWorkflowRunHistory(
  entries: WorkflowRunHistoryEntry[],
  projectWorkspaceId?: string,
): WorkflowRunHistoryEntry[] {
  if (!projectWorkspaceId) return sortAndCapWorkflowRunHistory(entries);
  return sortAndCapWorkflowRunHistory(entries).sort((a, b) => {
    const aProject = a.projectWorkspaceId === projectWorkspaceId ? 0 : 1;
    const bProject = b.projectWorkspaceId === projectWorkspaceId ? 0 : 1;
    return aProject - bProject || b.updatedAt - a.updatedAt;
  });
}

export function parseWorkflowRunHistory(value: string | null): WorkflowRunHistoryEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return sortAndCapWorkflowRunHistory(parsed.filter(isHistoryEntry));
  } catch {
    return [];
  }
}

function isHistoryEntry(value: unknown): value is WorkflowRunHistoryEntry {
  const entry = value as WorkflowRunHistoryEntry;
  return Boolean(
    entry &&
    typeof entry.id === "string" &&
    typeof entry.userTask === "string" &&
    typeof entry.status === "string" &&
    typeof entry.createdAt === "number" &&
    typeof entry.updatedAt === "number" &&
    entry.run &&
    Array.isArray(entry.run.steps),
  );
}
