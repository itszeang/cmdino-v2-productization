import { describe, expect, it } from "vitest";
import type { WorkflowRun } from "./workflowRun";
import {
  buildBuildInPublicKit,
  buildWorkflowBuildPublicKitArtifact,
  buildWorkflowFinalOutputMarkdown,
  buildWorkflowStepArtifactsMarkdown,
  buildInPublicPostFilename,
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
        parsedOutput: {
          artifacts: [
            {
              type: "note",
              path: "docs/onboarding.md",
              description: "Onboarding polish notes",
            },
          ],
          handoff: {
            target: "builder",
            message: "Builder should update the first-run CTA copy.",
          },
          next: ["Update first-run CTA copy."],
        },
      },
      {
        id: "reviewer",
        label: "Reviewer",
        agentRole: "reviewer",
        status: "completed",
        summary: "Flagged no obvious regression risk after review.",
        parsedOutput: {
          artifacts: [],
          handoff: {
            target: "user",
            message: "Run a build and smoke-check the first-run screen.",
          },
          next: ["Run the production build before sharing."],
        },
      },
    ],
    finalOutput: "Workflow complete.",
  };
}

describe("workflowArtifacts", () => {
  it("creates readable safe filenames", () => {
    expect(workflowFinalOutputFilename(makeRun())).toMatch(/^workflow-final-output_/);
    expect(workflowFinalOutputFilename(makeRun())).toContain("ship-onboarding-polish");
    expect(buildInPublicPostFilename(makeRun())).toMatch(/^build-in-public-post_/);
    expect(buildInPublicPostFilename(makeRun())).toMatch(/\.md$/);
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

  it("builds a build-in-public kit with required share sections", () => {
    const kit = buildBuildInPublicKit(makeRun());

    expect(kit).toContain("# Build-in-Public Kit");
    expect(kit).toContain("## Short Progress Summary");
    expect(kit).toContain("## What Changed");
    expect(kit).toContain("## What Was Hard");
    expect(kit).toContain("## Before / After Notes");
    expect(kit).toContain("## Next Step");
    expect(kit).toContain("## Tweet-Style Draft");
    expect(kit).toContain("## Technical Changelog");
    expect(kit).toContain("docs/onboarding.md");
    expect(kit).toContain("Run the production build before sharing.");
    expect(kit).not.toContain("files were changed");
    expect(kit).not.toContain("code was shipped");
  });

  it("creates a build-in-public post artifact for the output shelf", () => {
    const artifact = buildWorkflowBuildPublicKitArtifact(makeRun());

    expect(artifact.kind).toBe("build_in_public_post");
    expect(artifact.fileName).toMatch(/^build-in-public-post_/);
    expect(artifact.content).toContain("# Build-in-Public Kit");
  });

  it("has readable fallback for incomplete workflows", () => {
    const run = { ...makeRun(), steps: [] };

    expect(buildWorkflowStepArtifactsMarkdown(run)).toContain("No completed step summaries");
    expect(buildBuildInPublicKit(run)).toContain("Workflow is still in progress");
  });
});
