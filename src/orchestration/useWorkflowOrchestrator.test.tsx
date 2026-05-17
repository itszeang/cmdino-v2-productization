import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "../domain/workflowRun";
import { useWorkflowOrchestrator } from "./useWorkflowOrchestrator";

function resultBlock(input: {
  summary: string;
  artifactDescription?: string;
  handoffTarget?: string;
  handoffMessage?: string;
  next?: string[];
}): string {
  return [
    "CMDINO_RESULT_START",
    JSON.stringify({
      status: "success",
      summary: input.summary,
      artifacts: input.artifactDescription
        ? [{ type: "file", path: "src/App.tsx", description: input.artifactDescription }]
        : [],
      handoff: {
        target: input.handoffTarget ?? "Builder",
        message: input.handoffMessage ?? "Continue from the reviewed result.",
      },
      next: input.next ?? ["Continue to the next checkpoint."],
    }),
    "CMDINO_RESULT_END",
    "Edited by user before parsing.",
  ].join("\n");
}

describe("useWorkflowOrchestrator checkpoint continuation", () => {
  it("cannot continue without a valid parsed result", () => {
    const { result } = renderHook(() => useWorkflowOrchestrator());
    const run: WorkflowRun = {
      id: "run-1",
      userTask: "Build checkpoints.",
      mode: "checkpoint",
      status: "waiting_for_user",
      currentStepId: "planner",
      createdAt: 1,
      startedAt: 1,
      steps: [
        {
          id: "planner",
          label: "Planner",
          agentRole: "planner",
          status: "completed",
          summary: "Looks complete but has no parsed output.",
        },
        {
          id: "builder",
          label: "Builder",
          agentRole: "builder",
          status: "pending",
        },
      ],
    };

    act(() => {
      result.current.restoreRun(run);
      result.current.continueToNextStep();
    });

    expect(result.current.currentRun?.currentStepId).toBe("planner");
    expect(result.current.currentRun?.steps[1].status).toBe("pending");
  });

  it("carries previous summary, artifacts, handoff, and user edits into the next prompt", () => {
    const { result } = renderHook(() => useWorkflowOrchestrator());

    act(() => {
      result.current.startRun({
        userTask: "Build structured continuation.",
        steps: [
          { id: "planner", label: "Planner", agentRole: "planner", preferredProvider: "claude" },
          { id: "builder", label: "Builder", agentRole: "builder", preferredProvider: "codex" },
        ],
      });
    });

    act(() => {
      result.current.completeCurrentStepFromText(resultBlock({
        summary: "Plan the implementation in small explicit checkpoints.",
        artifactDescription: "Implementation plan artifact.",
        handoffTarget: "Codex Builder",
        handoffMessage: "Build only after reviewing the plan.",
      }));
    });

    act(() => {
      result.current.continueToNextStep();
    });

    const prompt = result.current.buildPromptForCurrentStep({});

    expect(result.current.currentRun?.currentStepId).toBe("builder");
    expect(prompt?.body).toContain("Plan the implementation in small explicit checkpoints.");
    expect(prompt?.body).toContain("Implementation plan artifact.");
    expect(prompt?.body).toContain("Build only after reviewing the plan.");
    expect(prompt?.body).toContain("Edited by user before parsing.");
  });

  it("final step produces a final workflow summary", () => {
    const { result } = renderHook(() => useWorkflowOrchestrator());

    act(() => {
      result.current.startRun({
        userTask: "Finish one-step workflow.",
        steps: [
          { id: "summary", label: "Summarizer", agentRole: "summarizer", preferredProvider: "claude" },
        ],
      });
    });

    act(() => {
      result.current.completeCurrentStepFromText(resultBlock({
        summary: "Completed the final checkpoint.",
        handoffTarget: "User",
        handoffMessage: "Review the final summary artifact.",
      }));
    });

    act(() => {
      result.current.continueToNextStep();
    });

    expect(result.current.currentRun?.status).toBe("completed");
    expect(result.current.currentRun?.currentStepId).toBeUndefined();
    expect(result.current.currentRun?.finalOutput).toContain("## Workflow Complete");
    expect(result.current.currentRun?.finalOutput).toContain("Completed the final checkpoint.");
    expect(result.current.currentRun?.finalOutput).toContain("Review the final summary artifact.");
  });
});
