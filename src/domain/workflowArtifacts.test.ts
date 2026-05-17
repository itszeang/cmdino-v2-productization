import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./workflowRun";
import {
  buildBuildInPublicDraft,
  buildWorkflowFinalOutputMarkdown,
  buildWorkflowStepArtifactsMarkdown,
  workflowBuildPublicDraftFilename,
  workflowFinalOutputFilename,
} from "./workflowArtifacts";

function makeRun(): WorkflowRun {
  return {
    id: "run-1",
    userTask: "Ship onboarding polish!",
    agentTeamId: "vibe-app-builder",
    mode: "checkpoint",
    status: "completed",
    createdAt: Date.UTC(2026, 4, 11, 6, 0, 0),
    completedAt: Date.UTC(2026, 4, 11, 6, 30, 0),
    steps: [
      {
        id: "planner",
        label: "Product Planner",
        agentRole: "planner",
        status: "completed",
        summary: "Scoped the onboarding polish to copy and first-run clarity.",
        parsedOutput: { handoff: "Builder should update the first-run CTA copy." },
      },
      {
        id: "reviewer",
        label: "Reviewer",
        agentRole: "reviewer",
        status: "completed",
        summary: "Flagged no obvious regression risk after review.",
        parsedOutput: { handoff: "Run a build and smoke-check the first-run screen." },
      },
    ],
    finalOutput: "Workflow complete.",
  };
}

describe("workflowArtifacts", () => {
  it("creates readable safe filenames", () => {
    expect(workflowFinalOutputFilename(makeRun())).toMatch(/^workflow-final-output_/);
    expect(workflowFinalOutputFilename(makeRun())).toContain("ship-onboarding-polish");
    expect(workflowBuildPublicDraftFilename(makeRun())).toMatch(/\.md$/);
  });

  it("builds final output markdown with task and step summaries", () => {
    const markdown = buildWorkflowFinalOutputMarkdown(makeRun());

    expect(markdown).toContain("Ship onboarding polish!");
    expect(markdown).toContain("Product Planner - Scoped the onboarding polish");
    expect(markdown).toContain("Workflow run: run-1");
  });

  it("builds combined step artifact markdown with handoffs", () => {
    const markdown = buildWorkflowStepArtifactsMarkdown(makeRun());

    expect(markdown).toContain("# Workflow Step Artifacts");
    expect(markdown).toContain("Builder should update the first-run CTA copy.");
    expect(markdown).toContain("Run a build and smoke-check");
  });

  it("builds a build-in-public draft with safe sections", () => {
    const draft = buildBuildInPublicDraft(makeRun());

    expect(draft).toContain("# Build-in-Public Draft");
    expect(draft).toContain("## What happened");
    expect(draft).toContain("## Social post draft");
    expect(draft).not.toContain("files were changed");
    expect(draft).not.toContain("code was shipped");
  });

  it("has readable fallback for incomplete workflows", () => {
    const run = { ...makeRun(), steps: [] };

    expect(buildWorkflowStepArtifactsMarkdown(run)).toContain("No completed step summaries");
    expect(buildBuildInPublicDraft(run)).toContain("Workflow is still in progress");
  });
});
