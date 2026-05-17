import type { WorkflowRun } from "./workflowRun";
import {
  buildWorkflowFinalSummary,
  completedStepSummaries,
} from "./workflowSummary";

export type WorkflowArtifactKind =
  | "workflow_final_output"
  | "workflow_step_summary"
  | "workflow_handoff"
  | "build_in_public_post";

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

export function buildInPublicPostFilename(run: WorkflowRun): string {
  return `build-in-public-post_${stamp(run)}_${safeSlug(run.userTask)}.md`;
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

function parsedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function bulletList(items: string[], fallback: string): string {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  return cleanItems.length > 0
    ? cleanItems.map((item) => `- ${item}`).join("\n")
    : `- ${fallback}`;
}

function stepArtifactLines(run: WorkflowRun): string[] {
  return run.steps.flatMap((step) => {
    const parsed = parsedRecord(step.parsedOutput);
    const artifacts = Array.isArray(parsed?.artifacts) ? parsed.artifacts : [];
    return artifacts.flatMap((artifact) => {
      const record = parsedRecord(artifact);
      if (!record || typeof record.description !== "string") return [];
      const type = typeof record.type === "string" ? record.type : "artifact";
      const path = typeof record.path === "string" && record.path.trim()
        ? ` (${record.path})`
        : "";
      return `${step.label}: ${type} - ${record.description}${path}`;
    });
  });
}

function latestNextAction(run: WorkflowRun): string | null {
  for (const step of [...run.steps].reverse()) {
    const parsed = parsedRecord(step.parsedOutput);
    const next = Array.isArray(parsed?.next) ? parsed.next : [];
    const first = next.find((item) => typeof item === "string" && item.trim());
    if (typeof first === "string") return first.trim();
  }
  return null;
}

function nextStepNote(run: WorkflowRun): string {
  const pending = run.steps.find((step) => step.status === "pending");
  if (pending) return `Continue with ${pending.label}.`;
  const parsedNext = latestNextAction(run);
  if (parsedNext) return parsedNext;
  const lastCompleted = [...completedStepSummaries(run)].reverse()[0];
  if (lastCompleted?.handoff) return lastCompleted.handoff;
  return "Review the generated output, then run the relevant checks before sharing or shipping.";
}

export function buildBuildInPublicKit(run: WorkflowRun): string {
  const completed = completedStepSummaries(run);
  const task = run.userTask || "a CMDino workflow task";
  const progressLines = completed.map((step) => `${step.label}: ${step.summary}`);
  const artifactLines = stepArtifactLines(run);
  const handoffLines = completed.map((step) => step.handoff).filter(Boolean);
  const beforeAfter = completed.length > 0
    ? [
        `Before: ${task}`,
        `After: ${completed[completed.length - 1].summary}`,
      ]
    : [];
  const next = nextStepNote(run);
  const tweetProgress = completed[0]?.summary ?? "checkpointed progress is being captured";

  return [
    "# Build-in-Public Kit",
    "",
    "## Short Progress Summary",
    "",
    `Worked on ${task}. ${completed.length > 0 ? completed[completed.length - 1].summary : "Workflow is still in progress or has no completed step summaries yet."}`,
    "",
    "## What Changed",
    "",
    bulletList(progressLines, "No completed step summaries were recorded yet."),
    "",
    "## What Was Hard",
    "",
    bulletList(handoffLines, "No blocker or difficulty was recorded in the completed step results."),
    "",
    "## Before / After Notes",
    "",
    bulletList(beforeAfter, "Add before/after notes after reviewing the workflow output."),
    "",
    "## Next Step",
    "",
    `- ${next}`,
    "",
    "## Tweet-Style Draft",
    "",
    `Building in public: ${task}`,
    "",
    `Progress: ${tweetProgress}`,
    "",
    `Next: ${next}`,
    "",
    "## Technical Changelog",
    "",
    bulletList([
      `Workflow run: ${run.id}`,
      `Agent team: ${run.agentTeamId ?? "Manual checkpoint workflow"}`,
      ...progressLines,
      ...artifactLines.map((line) => `Artifact - ${line}`),
    ], "No technical changelog entries were recorded yet."),
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

export function buildWorkflowBuildPublicKitArtifact(run: WorkflowRun): WorkflowArtifactFile {
  return {
    kind: "build_in_public_post",
    fileName: buildInPublicPostFilename(run),
    content: buildBuildInPublicKit(run),
  };
}
