export type InterventionKind =
  | "auth_required"
  | "permission_prompt"
  | "command_failed"
  | "agent_stuck"
  | "missing_cli"
  | "service_offline"
  | "needs_user_input"
  | "manual_review_required"
  | "runtime_error"
  | "unknown";

export type InterventionStatus =
  | "open"
  | "acknowledged"
  | "resolved"
  | "dismissed";

export type InterventionActionKind =
  | "open_terminal"
  | "open_setup_check"
  | "retry_step"
  | "skip_step"
  | "stop_workflow"
  | "mark_resolved"
  | "dismiss";

export interface InterventionAction {
  id: string;
  label: string;
  kind: InterventionActionKind;
  targetAgentId?: string;
  targetStepId?: string;
}

export interface Intervention {
  id: string;
  kind: InterventionKind;
  status: InterventionStatus;
  workflowRunId?: string;
  stepId?: string;
  agentId?: string;
  title: string;
  message: string;
  createdAt: number;
  resolvedAt?: number;
  actions: InterventionAction[];
}

export interface CreateTerminalInterventionInput {
  kind: InterventionKind;
  title: string;
  message: string;
  agentId?: string;
  workflowRunId?: string;
  stepId?: string;
  actions?: InterventionAction[];
}

export interface CreateWorkflowInterventionInput {
  kind: InterventionKind;
  title: string;
  message: string;
  workflowRunId?: string;
  stepId?: string;
  agentId?: string;
  actions?: InterventionAction[];
}

export interface CreateRuntimeInterventionInput {
  kind?: InterventionKind;
  title: string;
  message: string;
  agentId?: string;
  workflowRunId?: string;
  stepId?: string;
  actions?: InterventionAction[];
}

export function isOpenIntervention(intervention: Intervention): boolean {
  return intervention.status === "open" || intervention.status === "acknowledged";
}

export function isResolvedIntervention(intervention: Intervention): boolean {
  return intervention.status === "resolved" || intervention.status === "dismissed";
}

export function defaultInterventionActions(
  kind: InterventionKind,
  target?: { agentId?: string; stepId?: string },
): InterventionAction[] {
  const actions: InterventionAction[] = [];

  if (
    kind === "auth_required" ||
    kind === "missing_cli" ||
    kind === "service_offline" ||
    kind === "runtime_error" ||
    kind === "unknown"
  ) {
    actions.push({
      id: crypto.randomUUID(),
      label: "Open Setup Check",
      kind: "open_setup_check",
      targetAgentId: target?.agentId,
      targetStepId: target?.stepId,
    });
  }

  actions.push({
    id: crypto.randomUUID(),
    label: "Open Agents",
    kind: "open_terminal",
    targetAgentId: target?.agentId,
    targetStepId: target?.stepId,
  });
  actions.push({
    id: crypto.randomUUID(),
    label: "Mark Resolved",
    kind: "mark_resolved",
    targetAgentId: target?.agentId,
    targetStepId: target?.stepId,
  });
  actions.push({
    id: crypto.randomUUID(),
    label: "Dismiss",
    kind: "dismiss",
    targetAgentId: target?.agentId,
    targetStepId: target?.stepId,
  });

  return actions;
}

export function createTerminalIntervention(input: CreateTerminalInterventionInput): Intervention {
  const actions: InterventionAction[] = input.actions ?? defaultInterventionActions(input.kind, {
    agentId: input.agentId,
    stepId: input.stepId,
  });

  return {
    id: crypto.randomUUID(),
    kind: input.kind,
    status: "open",
    workflowRunId: input.workflowRunId,
    stepId: input.stepId,
    agentId: input.agentId,
    title: input.title,
    message: input.message,
    createdAt: Date.now(),
    actions,
  };
}

export function createWorkflowIntervention(input: CreateWorkflowInterventionInput): Intervention {
  return {
    id: crypto.randomUUID(),
    kind: input.kind,
    status: "open",
    workflowRunId: input.workflowRunId,
    stepId: input.stepId,
    agentId: input.agentId,
    title: input.title,
    message: input.message,
    createdAt: Date.now(),
    actions: input.actions ?? defaultInterventionActions(input.kind, {
      agentId: input.agentId,
      stepId: input.stepId,
    }),
  };
}

export function createRuntimeIntervention(input: CreateRuntimeInterventionInput): Intervention {
  return createTerminalIntervention({
    kind: input.kind ?? "runtime_error",
    title: input.title,
    message: input.message,
    agentId: input.agentId,
    workflowRunId: input.workflowRunId,
    stepId: input.stepId,
    actions: input.actions,
  });
}
