export type CmdinoResultStatus =
  | "completed"
  | "needs_user_action"
  | "failed";

export interface ParsedCmdinoResult {
  status: CmdinoResultStatus;
  summary: string;
  handoff: string;
  needsUserAction: boolean;
  userActionReason?: string;
  nextAgentInstruction?: string;
  rawJson: unknown;
}

export interface CmdinoResultParseSuccess {
  ok: true;
  result: ParsedCmdinoResult;
  rawBlock: string;
}

export interface CmdinoResultParseFailure {
  ok: false;
  reason:
    | "missing_block"
    | "invalid_json"
    | "invalid_shape";
  rawBlock?: string;
  errorMessage?: string;
}

export type CmdinoResultParseResult =
  | CmdinoResultParseSuccess
  | CmdinoResultParseFailure;

const RESULT_BLOCK_RE = /<CMDINO_RESULT>\s*([\s\S]*?)\s*<\/CMDINO_RESULT>/i;
const VALID_STATUSES = new Set<CmdinoResultStatus>([
  "completed",
  "needs_user_action",
  "failed",
]);

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function hasCmdinoResultBlock(text: string): boolean {
  return RESULT_BLOCK_RE.test(text);
}

export function parseCmdinoResult(text: string): CmdinoResultParseResult {
  const match = text.match(RESULT_BLOCK_RE);
  if (!match) return { ok: false, reason: "missing_block" };

  const rawBlock = match[1].trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBlock);
  } catch (err) {
    return {
      ok: false,
      reason: "invalid_json",
      rawBlock,
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }

  const record = asRecord(parsed);
  const status = record?.status;
  const summary = record?.summary;
  const handoff = record?.handoff;
  const needsUserAction = record?.needs_user_action;

  if (
    !record ||
    typeof status !== "string" ||
    !VALID_STATUSES.has(status as CmdinoResultStatus) ||
    typeof summary !== "string" ||
    typeof handoff !== "string" ||
    typeof needsUserAction !== "boolean"
  ) {
    return {
      ok: false,
      reason: "invalid_shape",
      rawBlock,
      errorMessage: "CMDINO_RESULT must include status, summary, handoff, and needs_user_action.",
    };
  }

  const userActionReason = record.user_action_reason;
  const nextAgentInstruction = record.next_agent_instruction;

  return {
    ok: true,
    rawBlock,
    result: {
      status: status as CmdinoResultStatus,
      summary,
      handoff,
      needsUserAction,
      userActionReason: typeof userActionReason === "string" && userActionReason.trim()
        ? userActionReason
        : undefined,
      nextAgentInstruction: typeof nextAgentInstruction === "string" && nextAgentInstruction.trim()
        ? nextAgentInstruction
        : undefined,
      rawJson: parsed,
    },
  };
}
