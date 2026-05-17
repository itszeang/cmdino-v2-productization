import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowRun } from "./workflowRun";
export { detectCwdMismatch } from "./agentCwd";

export interface WorkflowPromptAgentTarget {
  id: string;
  label: string;
  isRunning: boolean;
  lifecycle?: string;
  kind?: string;
  cwd?: string;
  isSuggested?: boolean;
}

export interface TerminalSubmitStrategy {
  enterSequence: "\r" | "\n" | "\r\n";
  delayMs: number;
}

export function buildWorkflowPromptAgentTargets(
  agents: TerminalAgent[],
  runningAgentIds: Set<string>,
  lifecycleByAgentId: Record<string, string> = {},
  suggestedAgentId?: string | null,
): WorkflowPromptAgentTarget[] {
  return agents.map((agent) => ({
    id: agent.id,
    label: agent.label,
    isRunning: runningAgentIds.has(agent.id),
    lifecycle: lifecycleByAgentId[agent.id],
    kind: agent.agentKind,
    cwd: agent.cwd,
    isSuggested: agent.id === suggestedAgentId,
  }));
}

/**
 * Normalise text into a single-line terminal submit payload.
 * Strips embedded line breaks, trims trailing whitespace, and appends CRLF.
 * \r\n is required for reliable line submission in Windows ConPTY and
 * readline-based TUIs such as Claude Code.
 */
export function buildTerminalSubmitPayload(text: string): string {
  const singleLine = text.replace(/[\r\n]+/g, " ").trimEnd();
  return `${singleLine}\r\n`;
}

export function ensurePromptSubmitText(prompt: string): string {
  return buildTerminalSubmitPayload(prompt);
}

export function buildTerminalSubmitLine(text: string): string {
  return text.replace(/[\r\n]+/g, " ").trimEnd();
}

export function getTerminalSubmitStrategy(agentKind?: string): TerminalSubmitStrategy {
  if (agentKind === "claude") {
    return { enterSequence: "\r", delayMs: 120 };
  }
  if (agentKind === "codex" || agentKind === "gemini") {
    return { enterSequence: "\r", delayMs: 90 };
  }
  return { enterSequence: "\r", delayMs: 90 };
}

/**
 * Build the short single-line terminal instruction for file-based prompt handoff.
 * This avoids multi-line TUI paste fragmentation in Claude/Codex interactive sessions.
 */
export function buildPromptFileInstruction(promptFilePath: string): string {
  return buildTerminalSubmitLine(
    `Open and follow the task instructions in "${promptFilePath}". Do not repeat or echo the file. Treat it as your task instructions, execute the requested workflow step, then reply ONLY with exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block. Even if you only planned or reviewed, still include the block. Do not stop without it.`,
  );
}

export function buildWorkflowResultCorrectionInstruction(): string {
  return buildTerminalSubmitLine(
    "Your previous response is incomplete. Do not redo the task. Reply ONLY with exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block for your previous answer. Do not repeat the explanation. Do not stop without that block.",
  );
}

export function buildWorkflowRecoveryPrompt(): string {
  return [
    "Your previous response is incomplete.",
    "",
    "Do not redo the task.",
    "Do not repeat the full explanation.",
    "Do not continue implementation.",
    "",
    "Reply ONLY with exactly one CMDINO_RESULT_START / CMDINO_RESULT_END block for your previous answer.",
    "",
    "Use this format:",
    "",
    "CMDINO_RESULT_START",
    "{",
    '  "status": "success",',
    '  "summary": "Briefly summarize your previous answer.",',
    '  "artifacts": [],',
    '  "handoff": { "target": "next agent or user", "message": "Clean handoff for the next agent or user." },',
    '  "next": ["Suggested instruction for the next workflow step."]',
    "}",
    "CMDINO_RESULT_END",
    "",
    'Allowed status values: "success", "needs_user_action", "failed".',
  ].join("\n");
}

export function markCurrentWorkflowStepPromptSent(
  run: WorkflowRun,
  input: {
    agentId: string;
    prompt: string;
    sentAt?: number;
  },
): WorkflowRun {
  if (!run.currentStepId) return run;
  const step = run.steps.find((item) => item.id === run.currentStepId);
  if (!step) return run;

  const sentAt = input.sentAt ?? Date.now();
  return {
    ...run,
    status: "running",
    steps: run.steps.map((item) => item.id === run.currentStepId
      ? {
          ...item,
          agentId: input.agentId,
          input: input.prompt,
          status: "running" as const,
          startedAt: item.startedAt ?? sentAt,
        }
      : item),
  };
}
