import type { WorkflowRun } from "./workflowRun";
import {
  buildWorkflowFinalSummary,
  completedStepSummaries,
} from "./workflowSummary";

export type WorkflowArtifactKind =
  | "workflow_final_output"
  | "workflow_step_summary"
  | "workflow_handoff"
  | "workflow_build_public_draft";

export interface WorkflowArtifactFile {
  kind: WorkflowArtifactKind;
  fileName: string;
  content: string;
}

function stamp(run: WorkflowRun): string {
  const ts = run.completedAt ?? run.startedAt ?? run.createdAt ?? Date.now();
  return new Date(ts).toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "Z");
}

function safeSlug(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "workflow";
}

export function workflowFinalOutputFilename(run: WorkflowRun): string {
  return `workflow-final-output_${stamp(run)}_${safeSlug(run.userTask)}.md`;
}

export function workflowStepArtifactsFilename(run: WorkflowRun): string {
  return `workflow-step-artifacts_${stamp(run)}_${safeSlug(run.userTask)}.md`;
}

export function workflowBuildPublicDraftFilename(run: WorkflowRun): string {
  return `workflow-build-public-draft_${stamp(run)}_${safeSlug(run.userTask)}.md`;
}

export function buildWorkflowFinalOutputMarkdown(run: WorkflowRun): string {
  return [
    buildWorkflowFinalSummary(run),
    "",
    "---",
    "",
    `Workflow run: ${run.id}`,
    "Saved from CMDino Output Shelf integration.",
  ].join("\n");
}

export function buildWorkflowStepArtifactsMarkdown(run: WorkflowRun): string {
  const completed = completedStepSummaries(run);
  const body = completed.length > 0
    ? completed.map((step, index) => [
        `## Step ${index + 1} - ${step.label}`,
        "",
        "### Summary",
        step.summary,
        "",
        "### Handoff",
        step.handoff || "No handoff recorded.",
      ].join("\n")).join("\n\n")
    : "No completed step summaries or handoffs were recorded.";

  return [
    "# Workflow Step Artifacts",
    "",
    "## User Task",
    run.userTask || "No user task was recorded.",
    "",
    body,
  ].join("\n");
}

export function buildBuildInPublicDraft(run: WorkflowRun): string {
  const completed = completedStepSummaries(run);
  const steps = completed.length > 0
    ? completed.map((step) => `- ${step.label}: ${step.summary}`).join("\n")
    : "- Workflow is still in progress or has no completed step summaries yet.";
  const team = run.steps.length > 0
    ? run.steps.map((step) => `- ${step.label}`).join("\n")
    : "- Manual checkpoint workflow";

  return [
    "# Build-in-Public Draft",
    "",
    `Today I worked on: ${run.userTask || "a CMDino workflow task"}`,
    "",
    "## AI team used",
    team,
    "",
    "## What happened",
    steps,
    "",
    "## What I learned",
    "- Breaking work into checkpointed agent steps makes review and handoff points easier to inspect.",
    "- Keeping the workflow human-in-the-loop makes the output easier to trust before acting on it.",
    "",
    "## Next",
    "- Review generated changes or recommendations.",
    "- Run relevant tests or manual checks.",
    "- Save follow-up context before continuing.",
    "",
    "## Social post draft",
    "",
    "I am building with a multi-agent workflow today.",
    "",
    `Task: ${run.userTask || "workflow task"}`,
    "",
    "Planner mapped it. Builder worked through it. Reviewer checked the risks.",
    "",
    "Still human-in-the-loop, but the workflow is starting to feel like an AI coding team.",
  ].join("\n");
}

export function buildWorkflowFinalOutputArtifact(run: WorkflowRun): WorkflowArtifactFile {
  return {
    kind: "workflow_final_output",
    fileName: workflowFinalOutputFilename(run),
    content: buildWorkflowFinalOutputMarkdown(run),
  };
}

export function buildWorkflowStepArtifacts(run: WorkflowRun): WorkflowArtifactFile {
  return {
    kind: "workflow_step_summary",
    fileName: workflowStepArtifactsFilename(run),
    content: buildWorkflowStepArtifactsMarkdown(run),
  };
}

export function buildWorkflowBuildPublicDraftArtifact(run: WorkflowRun): WorkflowArtifactFile {
  return {
    kind: "workflow_build_public_draft",
    fileName: workflowBuildPublicDraftFilename(run),
    content: buildBuildInPublicDraft(run),
  };
}
