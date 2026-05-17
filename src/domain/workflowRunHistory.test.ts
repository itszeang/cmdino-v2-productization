import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./workflowRun";
import {
  appendWorkflowRunArtifactPaths,
  buildWorkflowRunHistoryEntry,
  isWorkflowRunResumable,
  parseWorkflowRunHistory,
  prioritizeWorkflowRunHistory,
  sortAndCapWorkflowRunHistory,
  upsertWorkflowRunHistoryEntry,
  workflowRunStatusLabel,
} from "./workflowRunHistory";

function run(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
  return {
    id: "run-1",
    projectWorkspaceId: "project-1",
    agentTeamId: "bug-fix-team",
    userTask: "Fix setup check",
    mode: "checkpoint",
    status: "waiting_for_user",
    currentStepId: "step-2",
    createdAt: 100,
    startedAt: 100,
    steps: [
      {
        id: "step-1",
        label: "Bug Analyzer",
        agentRole: "reviewer",
        status: "completed",
        summary: "Found the issue.",
      },
      {
        id: "step-2",
        label: "Fix Builder",
        agentRole: "builder",
        status: "waiting_for_approval",
      },
    ],
    ...overrides,
  };
}

describe("workflowRunHistory", () => {
  it("builds a readable history entry from a workflow run", () => {
    expect(buildWorkflowRunHistoryEntry(run(), {
      projectName: "CMDino",
      agentTeamName: "Bug Fix Team",
      updatedAt: 200,
    })).toMatchObject({
      id: "run-1",
      projectWorkspaceId: "project-1",
      projectName: "CMDino",
      agentTeamId: "bug-fix-team",
      agentTeamName: "Bug Fix Team",
      userTask: "Fix setup check",
      status: "waiting_for_user",
      stepCount: 2,
      completedStepCount: 1,
      createdAt: 100,
      updatedAt: 200,
    });
  });

  it("caps and sorts recent runs by updated time", () => {
    const entries = Array.from({ length: 4 }, (_, index) => buildWorkflowRunHistoryEntry(run({
      id: `run-${index}`,
      createdAt: index,
    }), { updatedAt: index }));

    expect(sortAndCapWorkflowRunHistory(entries, 2).map((entry) => entry.id)).toEqual(["run-3", "run-2"]);
  });

  it("upserts runs without losing linked artifacts", () => {
    const first = buildWorkflowRunHistoryEntry(run(), {
      artifactPaths: ["outputs/final.md"],
      updatedAt: 100,
    });
    const second = buildWorkflowRunHistoryEntry(run({ status: "completed", currentStepId: undefined }), {
      updatedAt: 200,
    });

    expect(upsertWorkflowRunHistoryEntry([first], second)[0]).toMatchObject({
      status: "completed",
      artifactPaths: ["outputs/final.md"],
    });
  });

  it("prioritizes current project runs while retaining other local runs", () => {
    const projectRun = buildWorkflowRunHistoryEntry(run({ id: "project-run", projectWorkspaceId: "project-1" }), { updatedAt: 1 });
    const otherRun = buildWorkflowRunHistoryEntry(run({ id: "other-run", projectWorkspaceId: "project-2" }), { updatedAt: 2 });

    expect(prioritizeWorkflowRunHistory([otherRun, projectRun], "project-1").map((entry) => entry.id)).toEqual([
      "project-run",
      "other-run",
    ]);
  });

  it("labels and detects resumable runs", () => {
    const incomplete = buildWorkflowRunHistoryEntry(run());
    const completed = buildWorkflowRunHistoryEntry(run({
      status: "completed",
      currentStepId: undefined,
      completedAt: 300,
    }));

    expect(workflowRunStatusLabel(incomplete.status)).toBe("Waiting");
    expect(isWorkflowRunResumable(incomplete)).toBe(true);
    expect(isWorkflowRunResumable(completed)).toBe(false);
  });

  it("appends artifact paths and parses stored entries defensively", () => {
    const entry = buildWorkflowRunHistoryEntry(run(), { updatedAt: 100 });
    const withArtifacts = appendWorkflowRunArtifactPaths([entry], "run-1", ["outputs/final.md"], 200);

    expect(withArtifacts[0].artifactPaths).toEqual(["outputs/final.md"]);
    expect(withArtifacts[0].updatedAt).toBe(200);
    expect(parseWorkflowRunHistory(JSON.stringify(withArtifacts))).toHaveLength(1);
    expect(parseWorkflowRunHistory("{bad json")).toEqual([]);
  });
});
