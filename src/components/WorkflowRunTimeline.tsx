import type { WorkflowRunStep } from "../domain/workflowRun";
import type { WorkflowRun } from "../domain/workflowRun";

export interface WorkflowTimelineBinding {
  stepId: string;
  status: "bound" | "suggested" | "unbound" | "stopped" | "cwd_mismatch";
  agentLabel?: string;
  detail?: string;
}

function stepMarker(status: WorkflowRunStep["status"], isCurrent: boolean): string {
  if (status === "completed") return "done";
  if (status === "failed") return "failed";
  if (status === "needs_intervention") return "intervention";
  if (isCurrent || status === "running" || status === "waiting_for_approval") return "current";
  return "pending";
}

function statusLabel(status: WorkflowRunStep["status"]): string {
  if (status === "waiting_for_approval") return "prompt ready";
  if (status === "needs_intervention") return "needs intervention";
  return status.replace(/_/g, " ");
}

export function WorkflowRunTimeline({
  run,
  agentTeamName,
  bindings = [],
  onCopySummary,
}: {
  run: WorkflowRun;
  agentTeamName?: string;
  bindings?: WorkflowTimelineBinding[];
  onCopySummary?: (step: WorkflowRunStep) => void;
}) {
  return (
    <div className="workflow-timeline">
      <div className="workflow-timeline-head">
        <span>{agentTeamName ?? run.agentTeamId ?? "Checkpoint Workflow"}</span>
        <em>{run.steps.length} planned steps</em>
      </div>
      <div className="workflow-timeline-list">
        {run.steps.map((step, index) => {
          const isCurrent = step.id === run.currentStepId;
          const binding = bindings.find((item) => item.stepId === step.id);
          return (
            <div
              key={step.id}
              className="workflow-timeline-step"
              data-state={stepMarker(step.status, isCurrent)}
              data-current={String(isCurrent)}
            >
              <div className="workflow-timeline-dot" aria-hidden="true" />
              <div className="workflow-timeline-body">
                <div className="workflow-timeline-row">
                  <strong>{index + 1}. {step.label}</strong>
                  <span>{statusLabel(step.status)}</span>
                </div>
                <div className="workflow-binding-row" data-binding={binding?.status ?? "unbound"}>
                  <span>
                    {step.preferredProvider ? `${step.preferredProvider} / ` : ""}
                    {step.agentRole}
                  </span>
                  <em>
                    {binding?.status === "bound" && binding.agentLabel
                      ? `Bound: ${binding.agentLabel}`
                      : binding?.status === "suggested" && binding.agentLabel
                        ? `Suggested: ${binding.agentLabel}`
                        : binding?.status === "stopped" && binding.agentLabel
                          ? `Stopped: ${binding.agentLabel}`
                          : binding?.status === "cwd_mismatch" && binding.agentLabel
                            ? `CWD mismatch: ${binding.agentLabel}`
                            : "No running agent bound"}
                  </em>
                </div>
                {binding?.detail && (
                  <div className="workflow-binding-detail">{binding.detail}</div>
                )}
                {step.summary && (
                  <div className="workflow-timeline-summary">
                    <span>Summary: {step.summary}</span>
                    {onCopySummary && (
                      <button className="chat-mini-btn" onClick={() => onCopySummary(step)}>
                        Copy Summary
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
