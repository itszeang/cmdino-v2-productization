export type WorkflowRunStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused_for_intervention"
  | "waiting_for_user"
  | "completed"
  | "failed"
  | "cancelled";

export type WorkflowStepStatus =
  | "pending"
  | "starting"
  | "sending_input"
  | "running"
  | "capturing_output"
  | "waiting_for_approval"
  | "needs_intervention"
  | "completed"
  | "failed"
  | "skipped";

export type WorkflowMode =
  | "manual"
  | "checkpoint"
  | "safe_auto";

export interface WorkflowRunStep {
  id: string;
  label: string;
  agentRole: string;
  preferredProvider?: string;
  agentId?: string;
  status: WorkflowStepStatus;
  input?: string;
  rawOutput?: string;
  parsedOutput?: unknown;
  summary?: string;
  startedAt?: number;
  completedAt?: number;
  interventionIds?: string[];
}

export interface WorkflowRun {
  id: string;
  projectWorkspaceId?: string;
  agentTeamId?: string;
  userTask: string;
  mode: WorkflowMode;
  status: WorkflowRunStatus;
  currentStepId?: string;
  steps: WorkflowRunStep[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  finalOutput?: string;
}
