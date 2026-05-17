export type CmdinoChatMessageKind =
  | "user_task"
  | "system_status"
  | "agent_started"
  | "agent_completed"
  | "workflow_progress"
  | "intervention_required"
  | "final_output";

export interface CmdinoChatBaseMessage {
  id: string;
  kind: CmdinoChatMessageKind;
  createdAt: number;
}

export interface UserTaskChatMessage extends CmdinoChatBaseMessage {
  kind: "user_task";
  text: string;
  projectWorkspaceId?: string;
  agentTeamId?: string;
}

export interface SystemStatusChatMessage extends CmdinoChatBaseMessage {
  kind: "system_status";
  text: string;
}

export interface AgentStartedChatMessage extends CmdinoChatBaseMessage {
  kind: "agent_started";
  agentName: string;
  detail?: string;
}

export interface AgentCompletedChatMessage extends CmdinoChatBaseMessage {
  kind: "agent_completed";
  agentName: string;
  summary?: string;
}

export interface WorkflowProgressChatMessage extends CmdinoChatBaseMessage {
  kind: "workflow_progress";
  workflowRunId?: string;
  title: string;
  detail?: string;
}

export interface InterventionRequiredChatMessage extends CmdinoChatBaseMessage {
  kind: "intervention_required";
  interventionId: string;
  title: string;
  message: string;
  targetAgentId?: string;
  targetStepId?: string;
}

export interface FinalOutputChatMessage extends CmdinoChatBaseMessage {
  kind: "final_output";
  markdown: string;
}

export type CmdinoChatMessage =
  | UserTaskChatMessage
  | SystemStatusChatMessage
  | AgentStartedChatMessage
  | AgentCompletedChatMessage
  | WorkflowProgressChatMessage
  | InterventionRequiredChatMessage
  | FinalOutputChatMessage;

export function createUserTaskMessage(input: {
  text: string;
  projectWorkspaceId?: string;
  agentTeamId?: string;
}): UserTaskChatMessage {
  return {
    id: crypto.randomUUID(),
    kind: "user_task",
    createdAt: Date.now(),
    text: input.text.trim(),
    projectWorkspaceId: input.projectWorkspaceId,
    agentTeamId: input.agentTeamId,
  };
}

export function createSystemStatusMessage(text: string): SystemStatusChatMessage {
  return {
    id: crypto.randomUUID(),
    kind: "system_status",
    createdAt: Date.now(),
    text,
  };
}

export function createWorkflowProgressMessage(input: {
  title: string;
  detail?: string;
  workflowRunId?: string;
}): WorkflowProgressChatMessage {
  return {
    id: crypto.randomUUID(),
    kind: "workflow_progress",
    createdAt: Date.now(),
    title: input.title,
    detail: input.detail,
    workflowRunId: input.workflowRunId,
  };
}

export function createInterventionRequiredMessage(input: {
  interventionId?: string;
  title: string;
  message: string;
  targetAgentId?: string;
  targetStepId?: string;
}): InterventionRequiredChatMessage {
  return {
    id: crypto.randomUUID(),
    kind: "intervention_required",
    createdAt: Date.now(),
    interventionId: input.interventionId ?? crypto.randomUUID(),
    title: input.title,
    message: input.message,
    targetAgentId: input.targetAgentId,
    targetStepId: input.targetStepId,
  };
}

export function createPlaceholderProgressMessages(): CmdinoChatMessage[] {
  return [
    createSystemStatusMessage(
      "Workflow execution is not enabled yet. This task is staged for the future agent team runner.",
    ),
    createWorkflowProgressMessage({
      title: "Task captured",
      detail: "Upcoming checkpoint mode will turn this task into agent steps with human review between actions.",
    }),
  ];
}

