import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./workflowRun";
import {
  buildWorkflowFinalSummary,
  completedStepSummaries,
  nextStepLabel,
  workflowStepHandoff,
} from "./workflowSummary";

function makeRun(): WorkflowRun {
  return {
    id: "run-1",
    userTask: "Build onboarding polish.",
    mode: "checkpoint",
    status: "waiting_for_user",
    agentTeamId: "vibe-app-builder",
    currentStepId: "planner",
    createdAt: 1,
    steps: [
      {
        id: "planner",
        label: "Product Planner",
        agentRole: "planner",
        status: "completed",
        summary: "Created a narrow implementation plan.",
        parsedOutput: {
          handoff: "Builder should update the onboarding screen copy.",
        },
      },
      {
        id: "builder",
        label: "Builder",
        agentRole: "builder",
        status: "pending",
      },
    ],
  };
}

describe("workflowSummary", () => {
  it("extracts completed step summaries and handoffs", () => {
    const summaries = completedStepSummaries(makeRun());

    expect(summaries).toEqual([
      {
        stepId: "planner",
        label: "Product Planner",
        summary: "Created a narrow implementation plan.",
        handoff: "Builder should update the onboarding screen copy.",
      },
    ]);
  });

  it("finds the next pending step after the current step", () => {
    expect(nextStepLabel(makeRun())).toBe("Builder");
  });

  it("extracts handoff from parsed output", () => {
    expect(workflowStepHandoff(makeRun().steps[0])).toBe("Builder should update the onboarding screen copy.");
  });

  it("builds a final summary without claiming code changed automatically", () => {
    const markdown = buildWorkflowFinalSummary(makeRun());

    expect(markdown).toContain("Build onboarding polish.");
    expect(markdown).toContain("Product Planner - Created a narrow implementation plan.");
    expect(markdown).toContain("Builder should update the onboarding screen copy.");
    expect(markdown).not.toContain("code was changed");
    expect(markdown).not.toContain("files were updated");
  });

  it("has a readable fallback for empty completed summaries", () => {
    const run = { ...makeRun(), steps: [] };

    expect(buildWorkflowFinalSummary(run)).toContain("No completed step summaries were recorded.");
  });
});
