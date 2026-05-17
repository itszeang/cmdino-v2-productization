import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./workflowRun";
import {
  appendWorkflowRunArtifactPaths,
  buildResumePreview,
  buildWorkflowRunHistoryEntry,
  findRunForArtifactFileName,
  isWorkflowRunResumable,
  parseWorkflowRunHistory,
  prioritizeWorkflowRunHistory,
  resumeProjectMismatch,
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

  it("blocks resume for all terminal statuses", () => {
    for (const status of ["completed", "failed", "cancelled"] as const) {
      const entry = buildWorkflowRunHistoryEntry(run({ status, currentStepId: "step-2" }));
      expect(isWorkflowRunResumable(entry), `should not be resumable when status=${status}`).toBe(false);
    }
  });

  it("blocks resume when currentStepId is absent even if status is running", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ status: "running", currentStepId: undefined }));
    expect(isWorkflowRunResumable(entry)).toBe(false);
  });

  it("blocks resume when status is idle (no currentStepId)", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ status: "idle", currentStepId: undefined }));
    expect(isWorkflowRunResumable(entry)).toBe(false);
  });

  it("allows resume for all non-terminal statuses with a currentStepId", () => {
    for (const status of ["running", "paused_for_intervention", "waiting_for_user", "queued"] as const) {
      const entry = buildWorkflowRunHistoryEntry(run({ status, currentStepId: "step-2" }));
      expect(isWorkflowRunResumable(entry), `should be resumable when status=${status}`).toBe(true);
    }
  });

  it("detects project mismatch when both ids present and differ", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ projectWorkspaceId: "project-A" }));
    expect(resumeProjectMismatch(entry, "project-B")).toBe(true);
  });

  it("returns false for project mismatch when ids match", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ projectWorkspaceId: "project-A" }));
    expect(resumeProjectMismatch(entry, "project-A")).toBe(false);
  });

  it("returns false for project mismatch when entry has no project", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ projectWorkspaceId: undefined }));
    expect(resumeProjectMismatch(entry, "project-B")).toBe(false);
  });

  it("returns false for project mismatch when no current project is open", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ projectWorkspaceId: "project-A" }));
    expect(resumeProjectMismatch(entry, undefined)).toBe(false);
  });

  it("appends artifact paths and parses stored entries defensively", () => {
    const entry = buildWorkflowRunHistoryEntry(run(), { updatedAt: 100 });
    const withArtifacts = appendWorkflowRunArtifactPaths([entry], "run-1", ["outputs/final.md"], 200);

    expect(withArtifacts[0].artifactPaths).toEqual(["outputs/final.md"]);
    expect(withArtifacts[0].updatedAt).toBe(200);
    expect(parseWorkflowRunHistory(JSON.stringify(withArtifacts))).toHaveLength(1);
    expect(parseWorkflowRunHistory("{bad json")).toEqual([]);
  });

  it("finds the run that produced a given artifact by filename", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ id: "run-artifact" }), {
      artifactPaths: ["workflow-final-output_2026-05-17_fix-setup.md"],
    });
    const other = buildWorkflowRunHistoryEntry(run({ id: "run-other" }), {
      artifactPaths: ["workflow-step-artifacts_2026-05-16_other-task.md"],
    });

    expect(findRunForArtifactFileName([entry, other], "workflow-final-output_2026-05-17_fix-setup.md")?.id).toBe("run-artifact");
    expect(findRunForArtifactFileName([entry, other], "workflow-step-artifacts_2026-05-16_other-task.md")?.id).toBe("run-other");
  });

  it("finds a run when artifactPaths stores full absolute paths", () => {
    const entry = buildWorkflowRunHistoryEntry(run({ id: "run-absolute" }), {
      artifactPaths: ["C:\\Users\\burak\\AppData\\Roaming\\cmdino\\outputs\\workflow-final-output_2026-05-17_task.md"],
    });

    expect(findRunForArtifactFileName([entry], "workflow-final-output_2026-05-17_task.md")?.id).toBe("run-absolute");
  });

  it("does not mix artifacts from different project runs", () => {
    const projectA = buildWorkflowRunHistoryEntry(
      run({ id: "run-A", projectWorkspaceId: "project-A" }),
      { artifactPaths: ["workflow-final-output_A.md"] },
    );
    const projectB = buildWorkflowRunHistoryEntry(
      run({ id: "run-B", projectWorkspaceId: "project-B" }),
      { artifactPaths: ["workflow-final-output_B.md"] },
    );

    expect(findRunForArtifactFileName([projectA, projectB], "workflow-final-output_A.md")?.id).toBe("run-A");
    expect(findRunForArtifactFileName([projectA, projectB], "workflow-final-output_B.md")?.id).toBe("run-B");
    expect(findRunForArtifactFileName([projectA, projectB], "workflow-final-output_A.md")?.projectWorkspaceId).toBe("project-A");
  });

  it("returns null when no run claims the artifact", () => {
    const entry = buildWorkflowRunHistoryEntry(run(), { artifactPaths: ["some-other.md"] });
    expect(findRunForArtifactFileName([entry], "workflow-final-output_unlinked.md")).toBeNull();
    expect(findRunForArtifactFileName([], "anything.md")).toBeNull();
  });
});

describe("buildResumePreview", () => {
  function resumableEntry(overrides: Partial<WorkflowRun> = {}) {
    return buildWorkflowRunHistoryEntry(
      run({ ...overrides }),
      { projectName: "CMDino", agentTeamName: "Bug Fix Team" },
    );
  }

  it("returns canResume true with no warnings when everything matches", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, {
      currentProjectId: "project-1",
      currentAgentTeamId: "bug-fix-team",
      hasRunningAgents: false,
    });

    expect(preview.canResume).toBe(true);
    expect(preview.warnings).toHaveLength(0);
    expect(preview.restoreItems.length).toBeGreaterThan(0);
  });

  it("blocks resume and emits project_mismatch warning when projects differ", () => {
    const entry = resumableEntry({ projectWorkspaceId: "project-A" });
    const preview = buildResumePreview(entry, { currentProjectId: "project-B" });

    expect(preview.canResume).toBe(false);
    const mismatch = preview.warnings.find((w) => w.kind === "project_mismatch");
    expect(mismatch).toBeDefined();
    expect(mismatch?.blocksResume).toBe(true);
    expect(mismatch?.message).toContain("CMDino");
  });

  it("emits team_mismatch warning without blocking when teams differ", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, {
      currentProjectId: "project-1",
      currentAgentTeamId: "ui-polish-team",
    });

    expect(preview.canResume).toBe(true);
    const warn = preview.warnings.find((w) => w.kind === "team_mismatch");
    expect(warn).toBeDefined();
    expect(warn?.blocksResume).toBe(false);
  });

  it("emits agents_running warning without blocking when agents are active", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, {
      currentProjectId: "project-1",
      hasRunningAgents: true,
    });

    expect(preview.canResume).toBe(true);
    const warn = preview.warnings.find((w) => w.kind === "agents_running");
    expect(warn).toBeDefined();
    expect(warn?.blocksResume).toBe(false);
  });

  it("can have both team_mismatch and agents_running as non-blocking warnings simultaneously", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, {
      currentProjectId: "project-1",
      currentAgentTeamId: "other-team",
      hasRunningAgents: true,
    });

    expect(preview.canResume).toBe(true);
    expect(preview.warnings).toHaveLength(2);
    expect(preview.warnings.every((w) => !w.blocksResume)).toBe(true);
  });

  it("blocks resume for a non-resumable terminal run", () => {
    const entry = resumableEntry({ status: "completed", currentStepId: undefined });
    const preview = buildResumePreview(entry, { currentProjectId: "project-1" });

    expect(preview.canResume).toBe(false);
  });

  it("restoreItems always include no-auto-send notice", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, { currentProjectId: "project-1" });

    const hasNoAutoSend = preview.restoreItems.some((item) =>
      item.toLowerCase().includes("no prompt") || item.toLowerCase().includes("automatically"),
    );
    expect(hasNoAutoSend).toBe(true);
  });

  it("restoreItems include team name when known", () => {
    const entry = resumableEntry();
    const preview = buildResumePreview(entry, { currentProjectId: "project-1" });

    expect(preview.restoreItems.some((item) => item.includes("Bug Fix Team"))).toBe(true);
  });
});
