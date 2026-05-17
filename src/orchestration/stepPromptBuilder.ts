import type { ContextReferenceGroups } from "../domain/contextLibrary";

export interface StepPromptInput {
  projectName?: string;
  projectPath?: string;
  userTask: string;
  stepLabel: string;
  agentRole: string;
  agentTeamName?: string;
  previousSummaries?: string[];
  previousHandoffs?: string[];
  previousArtifacts?: string[];
  previousReviewedResults?: string[];
  outputContract?: string;
  contextReferences?: ContextReferenceGroups;
}

export interface BuiltStepPrompt {
  title: string;
  body: string;
}

export function buildCmdinoResultContract(): string {
  return [
    "Structured response contract - mandatory",
    "",
    "End your response with exactly one machine-readable CMDINO_RESULT block using this format:",
    "",
    "CMDINO_RESULT_START",
    "{",
    '  "status": "success",',
    '  "summary": "Short summary of what you did or decided.",',
    '  "artifacts": [',
    '    { "type": "note", "path": ".cmdino/example.md", "description": "Optional artifact path and description." }',
    "  ],",
    '  "handoff": { "target": "next agent or user", "message": "What the next agent or user needs to know." },',
    '  "next": ["Suggested next checkpoint or user action."]',
    "}",
    "CMDINO_RESULT_END",
    "",
    'Allowed status values: "success", "needs_user_action", "failed".',
    'Use "needs_user_action" when authentication, permissions, unclear scope, destructive action approval, or manual review is required.',
    "If there are no artifacts, use an empty artifacts array.",
    "If there is no follow-up, use an empty next array.",
    "Do not wrap this block in Markdown fences.",
  ].join("\n");
}

function buildFinalWorkflowResponseInstruction(): string {
  return [
    "Final response requirement - mandatory",
    "",
    "Your final answer MUST end with exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block.",
    "The handoff and next-step guidance must be inside that JSON block.",
    "",
    "If your answer does not include this block, CMDino will treat your response as incomplete.",
    "",
    "Even if you only planned, reviewed, analyzed, or decided not to modify files, you still MUST include the block.",
    "",
    "Do not ask the user to continue.",
    "Do not end with an unstructured summary.",
    "Do not stop after a normal explanation.",
  ].join("\n");
}

function listSection(title: string, items: string[] | undefined): string {
  const clean = (items ?? []).map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return `${title}\n- None yet.`;
  return [
    title,
    ...clean.map((item) => `- ${item}`),
  ].join("\n");
}

function contextReferenceSection(refs?: ContextReferenceGroups): string | null {
  const global = refs?.global.map((item) => item.trim()).filter(Boolean) ?? [];
  const agent = refs?.agent.map((item) => item.trim()).filter(Boolean) ?? [];
  if (global.length === 0 && agent.length === 0) return null;
  const lines = [
    "CMDino Context Files",
  ];
  if (global.length > 0) {
    lines.push("Before working, read these CMDino project context files:");
    lines.push(...global.map((item) => `- ${item}`));
  }
  if (agent.length > 0) {
    if (global.length > 0) lines.push("");
    lines.push("Also read your assigned agent context:");
    lines.push(...agent.map((item) => `- ${item}`));
  }
  return lines.join("\n");
}

export function buildStepPrompt(input: StepPromptInput): BuiltStepPrompt {
  const projectName = input.projectName?.trim() || "Unknown project";
  const projectPath = input.projectPath?.trim() || "No project path selected";
  const teamName = input.agentTeamName?.trim() || "checkpoint workflow";
  const outputContract = input.outputContract?.trim() || "Use the CMDINO_RESULT block to summarize your output.";
  const contextSection = contextReferenceSection(input.contextReferences);

  return {
    title: `${input.stepLabel}: ${input.agentRole}`,
    body: [
      "CMDino execution directive",
      "- Do not repeat or echo this prompt.",
      "- Follow these instructions as the task for this workflow step.",
      "- When finished, reply with the required structured blocks instead of a normal chat answer.",
      "",
      `You are the ${input.stepLabel} in CMDino's ${teamName}.`,
      `Role: ${input.agentRole}.`,
      "",
      "Project",
      `- Name: ${projectName}`,
      `- Path: ${projectPath}`,
      "",
      "User Task",
      input.userTask.trim(),
      "",
      ...(contextSection ? [contextSection, ""] : []),
      listSection("Previous Step Summaries", input.previousSummaries),
      "",
      listSection("Previous Step Artifacts", input.previousArtifacts),
      "",
      listSection("Previous Handoffs", input.previousHandoffs),
      "",
      listSection("User-Reviewed Previous Results", input.previousReviewedResults),
      "",
      "Step Output Contract",
      outputContract,
      "",
      "Human-in-the-loop safety",
      "- Do not perform destructive actions without explicit user approval.",
      "- If authentication, permissions, unclear scope, or manual review is needed, stop and report needs_user_action.",
      "- Keep the response focused on this workflow step.",
      "",
      buildCmdinoResultContract(),
      "",
      buildFinalWorkflowResponseInstruction(),
    ].join("\n"),
  };
}
