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

export function normalizeWorkflowResultCapture(capture: WorkflowResultCapture): WorkflowResultCapture {
  return {
    ...capture,
    text: normalizeCapturedWorkflowResult(capture.text),
  };
}

export interface StructuredWorkflowOutputExtraction {
  validForParse: boolean;
  structuredText: string;
  warning?: string;
  rawText: string;
}

const RESULT_OPEN_RE = /<CMDINO_RESULT>/i;
const RESULT_CLOSE_RE = /<\/CMDINO_RESULT>/i;
const HANDOFF_OPEN_RE = /<CMDINO_HANDOFF>/i;
const HANDOFF_CLOSE_RE = /<\/CMDINO_HANDOFF>/i;

export function extractStructuredWorkflowOutput(text: string): StructuredWorkflowOutputExtraction {
  const hasResult = RESULT_OPEN_RE.test(text);
  const hasHandoff = HANDOFF_OPEN_RE.test(text);

  if (!hasResult) {
    return {
      validForParse: false,
      structuredText: "",
      warning: "Captured output is missing CMDINO_RESULT / CMDINO_HANDOFF. Ask the agent to finish with structured blocks.",
      rawText: text,
    };
  }

  const resultStart = text.search(RESULT_OPEN_RE);

  if (hasResult && hasHandoff) {
    const handoffCloseMatch = HANDOFF_CLOSE_RE.exec(text);
    if (handoffCloseMatch && handoffCloseMatch.index !== undefined) {
      const endIndex = handoffCloseMatch.index + handoffCloseMatch[0].length;
      return {
        validForParse: true,
        structuredText: text.slice(resultStart, endIndex).trim(),
        rawText: text,
      };
    }
  }

  const resultCloseMatch = RESULT_CLOSE_RE.exec(text);
  if (resultCloseMatch && resultCloseMatch.index !== undefined) {
    const endIndex = resultCloseMatch.index + resultCloseMatch[0].length;
    return {
      validForParse: true,
      structuredText: text.slice(resultStart, endIndex).trim(),
      warning: "Captured output is missing CMDINO_HANDOFF.",
      rawText: text,
    };
  }

  return {
    validForParse: false,
    structuredText: "",
    warning: "Captured output has an incomplete CMDINO_RESULT block.",
    rawText: text,
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
