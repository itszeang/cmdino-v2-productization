export type WorkflowResultCaptureFailureReason =
  | "missing_target"
  | "target_not_running"
  | "capture_unavailable"
  | "no_output"
  | "capture_failed";

export interface WorkflowResultCaptureStatusInput {
  agentId?: string;
  isRunning?: boolean;
  hasCaptureGetter?: boolean;
}

export interface WorkflowResultCapture {
  text: string;
  source: "selected_text" | "latest_output";
}

export interface NormalizedWorkflowResultCapture extends WorkflowResultCapture {
  rawCapturedOutput: string;
  cleanedCapturedOutput: string;
}

export function canCaptureFromAgent(input: WorkflowResultCaptureStatusInput): boolean {
  return Boolean(input.agentId && input.isRunning && input.hasCaptureGetter);
}

export function getWorkflowResultCaptureFailureReason(
  input: WorkflowResultCaptureStatusInput,
): WorkflowResultCaptureFailureReason | null {
  if (!input.agentId) return "missing_target";
  if (!input.isRunning) return "target_not_running";
  if (!input.hasCaptureGetter) return "capture_unavailable";
  return null;
}

export function normalizeCapturedWorkflowResult(text: string): string {
  return text.trimEnd();
}

const ANSI_ESCAPE_RE = /[\u001B\u009B][[\]()#;?]*(?:(?:(?:[a-zA-Z\d]*(?:;[a-zA-Z\d]*)*)?\u0007)|(?:(?:\d{1,4}(?:;\d{0,4})*)?[\dA-PR-TZcf-nq-uy=><~]))/g;
const CONTROL_SEQUENCE_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export function stripAnsiControlSequences(text: string): string {
  return text
    .replace(ANSI_ESCAPE_RE, "")
    .replace(CONTROL_SEQUENCE_RE, "");
}

export function cleanCapturedWorkflowOutput(text: string): string {
  return normalizeCapturedWorkflowResult(stripAnsiControlSequences(text));
}

export function normalizeWorkflowResultCapture(capture: WorkflowResultCapture): NormalizedWorkflowResultCapture {
  const rawCapturedOutput = normalizeCapturedWorkflowResult(capture.text);
  const cleanedCapturedOutput = cleanCapturedWorkflowOutput(capture.text);
  return {
    ...capture,
    text: cleanedCapturedOutput,
    rawCapturedOutput,
    cleanedCapturedOutput,
  };
}

export interface StructuredWorkflowOutputExtraction {
  validForParse: boolean;
  structuredText: string;
  warning?: string;
  rawText: string;
  rawCapturedOutput: string;
  cleanedCapturedOutput: string;
}

const RESULT_BLOCK_RE = /CMDINO_RESULT_START\s*[\s\S]*?\s*CMDINO_RESULT_END/gi;
const LEGACY_RESULT_BLOCK_RE = /<CMDINO_RESULT>\s*[\s\S]*?\s*<\/CMDINO_RESULT>/gi;
const HANDOFF_OPEN_RE = /<CMDINO_HANDOFF>/i;
const HANDOFF_CLOSE_RE = /<\/CMDINO_HANDOFF>/i;

function lastRegexMatch(text: string, re: RegExp): RegExpExecArray | null {
  let last: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    last = match;
  }
  return last;
}

export function extractStructuredWorkflowOutput(text: string): StructuredWorkflowOutputExtraction {
  const rawCapturedOutput = normalizeCapturedWorkflowResult(text);
  const cleanedCapturedOutput = cleanCapturedWorkflowOutput(text);
  const resultMatch = lastRegexMatch(cleanedCapturedOutput, new RegExp(RESULT_BLOCK_RE));
  if (resultMatch) {
    return {
      validForParse: true,
      structuredText: resultMatch[0].trim(),
      rawText: text,
      rawCapturedOutput,
      cleanedCapturedOutput,
    };
  }

  const hasIncompleteResult = /CMDINO_RESULT_START/i.test(cleanedCapturedOutput);
  if (hasIncompleteResult) {
    return {
      validForParse: false,
      structuredText: cleanedCapturedOutput,
      warning: "Captured output has an incomplete CMDINO_RESULT_START / CMDINO_RESULT_END block.",
      rawText: text,
      rawCapturedOutput,
      cleanedCapturedOutput,
    };
  }

  const legacyResultMatch = lastRegexMatch(cleanedCapturedOutput, new RegExp(LEGACY_RESULT_BLOCK_RE));
  const hasHandoff = HANDOFF_OPEN_RE.test(cleanedCapturedOutput);

  if (!legacyResultMatch) {
    return {
      validForParse: false,
      structuredText: cleanedCapturedOutput,
      warning: "Captured output is missing CMDINO_RESULT_START / CMDINO_RESULT_END. Ask the agent to finish with the structured result block.",
      rawText: text,
      rawCapturedOutput,
      cleanedCapturedOutput,
    };
  }

  if (hasHandoff) {
    const handoffCloseMatch = HANDOFF_CLOSE_RE.exec(cleanedCapturedOutput);
    if (handoffCloseMatch && handoffCloseMatch.index !== undefined) {
      const endIndex = handoffCloseMatch.index + handoffCloseMatch[0].length;
      return {
        validForParse: true,
        structuredText: cleanedCapturedOutput.slice(legacyResultMatch.index, endIndex).trim(),
        rawText: text,
        rawCapturedOutput,
        cleanedCapturedOutput,
      };
    }
  }

  return {
    validForParse: true,
    structuredText: legacyResultMatch[0].trim(),
    warning: "Captured output is missing CMDINO_HANDOFF.",
    rawText: text,
    rawCapturedOutput,
    cleanedCapturedOutput,
  };
}

export function captureFailureMessage(
  reason: WorkflowResultCaptureFailureReason,
  targetLabel?: string,
): string {
  const label = targetLabel ? ` from ${targetLabel}` : "";
  if (reason === "missing_target") {
    return "No target agent selected for this step. Paste the result manually or send the prompt to an agent first.";
  }
  if (reason === "target_not_running") {
    return `Could not capture output${label}. Start the target agent or paste the result manually.`;
  }
  if (reason === "capture_unavailable") {
    return `Could not capture output${label}. Open Agent Workspace and paste the result manually.`;
  }
  if (reason === "no_output") {
    return `No usable output was captured${label}. Select result text in the terminal or paste manually.`;
  }
  return `Could not capture output${label}. Open Agent Workspace and select/copy the result manually.`;
}
