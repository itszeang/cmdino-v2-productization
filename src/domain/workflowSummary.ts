import type { WorkflowRun, WorkflowRunStep } from "./workflowRun";

export interface CompletedStepSummary {
  stepId: string;
  label: string;
  summary: string;
  handoff: string;
}

function parsedRecord(step?: WorkflowRunStep | null): Record<string, unknown> | null {
  if (!step) return null;
  const parsed = step.parsedOutput;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? parsed as Record<string, unknown>
    : null;
}

export function workflowStepHandoff(step?: WorkflowRunStep | null): string {
  const handoff = parsedRecord(step)?.handoff;
  return typeof handoff === "string" ? handoff.trim() : "";
}

export function completedStepSummaries(run: WorkflowRun): CompletedStepSummary[] {
  return run.steps
    .filter((step) => step.status === "completed")
    .map((step) => ({
      stepId: step.id,
      label: step.label,
      summary: step.summary?.trim() || "Completed.",
      handoff: workflowStepHandoff(step),
    }));
}

export function nextStepAfterCurrent(run: WorkflowRun): WorkflowRunStep | null {
  if (!run.currentStepId) return null;
  const currentIndex = run.steps.findIndex((step) => step.id === run.currentStepId);
  if (currentIndex < 0) return null;
  return run.steps.slice(currentIndex + 1).find((step) => step.status === "pending") ?? null;
}

export function nextStepLabel(run: WorkflowRun): string | null {
  return nextStepAfterCurrent(run)?.label ?? null;
}

export function buildWorkflowFinalSummary(run: WorkflowRun): string {
  const completed = completedStepSummaries(run);
  const stepResults = completed.length > 0
    ? completed.map((step, index) => `${index + 1}. ${step.label} - ${step.summary}`).join("\n")
    : "No completed step summaries were recorded.";
  const finalHandoff = [...completed].reverse().find((step) => step.handoff)?.handoff
    ?? "No final handoff or recommendation was recorded.";

  return [
    "## Workflow Complete",
    "",
    "### User Task",
    run.userTask || "No user task was recorded.",
    "",
    "### Agent Team",
    run.agentTeamId ?? "Manual checkpoint workflow",
    "",
    "### Step Results",
    stepResults,
    "",
    "### Final Handoff / Recommendation",
    finalHandoff,
    "",
    "### Next Suggested Action",
    "- Review the agent summaries and handoffs.",
    "- Run the relevant build, tests, or manual checks before trusting the result.",
    "- Save a memory brief or workflow artifact if this should carry into future work.",
  ].join("\n");
}
