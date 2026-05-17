import { describe, expect, it } from "vitest";
import {
  createRuntimeIntervention,
  createWorkflowIntervention,
  defaultInterventionActions,
  isOpenIntervention,
  isResolvedIntervention,
  type Intervention,
} from "./intervention";

describe("intervention domain", () => {
  it("creates a workflow intervention", () => {
    const intervention = createWorkflowIntervention({
      kind: "needs_user_input",
      title: "Workflow needs input",
      message: "Permission prompt detected.",
      workflowRunId: "run-1",
      stepId: "step-1",
    });

    expect(intervention.kind).toBe("needs_user_input");
    expect(intervention.status).toBe("open");
    expect(intervention.workflowRunId).toBe("run-1");
    expect(intervention.stepId).toBe("step-1");
    expect(intervention.actions.map((action) => action.kind)).toContain("mark_resolved");
  });

  it("detects open and resolved interventions", () => {
    const base: Intervention = {
      id: "i1",
      kind: "manual_review_required",
      status: "acknowledged",
      title: "Review",
      message: "Needs review",
      createdAt: 1,
      actions: [],
    };

    expect(isOpenIntervention(base)).toBe(true);
    expect(isResolvedIntervention(base)).toBe(false);
    expect(isOpenIntervention({ ...base, status: "resolved" })).toBe(false);
    expect(isResolvedIntervention({ ...base, status: "dismissed" })).toBe(true);
  });

  it("adds setup check action for setup-related kinds", () => {
    const actions = defaultInterventionActions("missing_cli");

    expect(actions.map((action) => action.kind)).toContain("open_setup_check");
    expect(actions.map((action) => action.kind)).toContain("open_terminal");
    expect(actions.map((action) => action.kind)).toContain("dismiss");
  });

  it("creates a runtime intervention", () => {
    const intervention = createRuntimeIntervention({
      title: "Runtime error",
      message: "Command failed.",
      agentId: "agent-1",
    });

    expect(intervention.kind).toBe("runtime_error");
    expect(intervention.agentId).toBe("agent-1");
  });
});
