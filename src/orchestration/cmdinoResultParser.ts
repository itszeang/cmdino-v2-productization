export type CmdinoResultStatus =
  | "success"
  | "needs_user_action"
  | "failed";

export interface ParsedCmdinoArtifact {
  type: string;
  path?: string;
  description: string;
}

export interface ParsedCmdinoHandoff {
  target: string;
  message: string;
}

export interface ParsedCmdinoResult {
  status: CmdinoResultStatus;
  summary: string;
  artifacts: ParsedCmdinoArtifact[];
  handoff: ParsedCmdinoHandoff;
  next: string[];
  needsUserAction: boolean;
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

const RESULT_BLOCK_PATTERN = "CMDINO_RESULT_START\\s*([\\s\\S]*?)\\s*CMDINO_RESULT_END";
const LEGACY_RESULT_BLOCK_PATTERN = "<CMDINO_RESULT>\\s*([\\s\\S]*?)\\s*<\\/CMDINO_RESULT>";
const VALID_STATUSES = new Set<CmdinoResultStatus>([
  "success",
  "needs_user_action",
  "failed",
]);

interface ResultBlockMatch {
  rawBlock: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asStringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : null;
}

function parseArtifacts(value: unknown): ParsedCmdinoArtifact[] | null {
  if (!Array.isArray(value)) return null;
  const artifacts: ParsedCmdinoArtifact[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) return null;
    if (typeof record.type !== "string" || typeof record.description !== "string") return null;
    if (record.path !== undefined && typeof record.path !== "string") return null;
    artifacts.push({
      type: record.type,
      path: typeof record.path === "string" ? record.path : undefined,
      description: record.description,
    });
  }
  return artifacts;
}

function parseHandoff(value: unknown): ParsedCmdinoHandoff | null {
  const record = asRecord(value);
  if (!record) return null;
  if (typeof record.target !== "string" || typeof record.message !== "string") return null;
  return {
    target: record.target,
    message: record.message,
  };
}

function findLastResultBlock(text: string, pattern: string): ResultBlockMatch | null {
  const re = new RegExp(pattern, "gi");
  let last: ResultBlockMatch | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    last = { rawBlock: match[1].trim() };
  }
  return last;
}

function parseLegacyResult(parsed: unknown, rawBlock: string): CmdinoResultParseResult {
  const record = asRecord(parsed);
  const status = record?.status;
  const summary = record?.summary;
  const handoff = record?.handoff;
  const needsUserAction = record?.needs_user_action;
  const legacyStatus = status === "completed" ? "success" : status;

  if (
    !record ||
    typeof legacyStatus !== "string" ||
    !VALID_STATUSES.has(legacyStatus as CmdinoResultStatus) ||
    typeof summary !== "string" ||
    typeof handoff !== "string" ||
    typeof needsUserAction !== "boolean"
  ) {
    return {
      ok: false,
      reason: "invalid_shape",
      rawBlock,
      errorMessage: "CMDINO_RESULT must include status, summary, artifacts, handoff, and next.",
    };
  }

  const nextAgentInstruction = record.next_agent_instruction;
  const userActionReason = record.user_action_reason;
  const next = [
    typeof nextAgentInstruction === "string" ? nextAgentInstruction : "",
    typeof userActionReason === "string" ? userActionReason : "",
  ].map((item) => item.trim()).filter(Boolean);

  return {
    ok: true,
    rawBlock,
    result: {
      status: legacyStatus as CmdinoResultStatus,
      summary,
      artifacts: [],
      handoff: {
        target: "next agent or user",
        message: handoff,
      },
      next,
      needsUserAction,
      rawJson: parsed,
    },
  };
}

export function hasCmdinoResultBlock(text: string): boolean {
  return new RegExp(RESULT_BLOCK_PATTERN, "i").test(text) ||
    new RegExp(LEGACY_RESULT_BLOCK_PATTERN, "i").test(text);
}

export function parseCmdinoResult(text: string): CmdinoResultParseResult {
  const match = findLastResultBlock(text, RESULT_BLOCK_PATTERN);
  const legacyMatch = match ? null : findLastResultBlock(text, LEGACY_RESULT_BLOCK_PATTERN);
  const activeMatch = match ?? legacyMatch;
  if (!activeMatch) return { ok: false, reason: "missing_block" };

  const rawBlock = activeMatch.rawBlock;
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

  if (legacyMatch) {
    return parseLegacyResult(parsed, rawBlock);
  }

  const record = asRecord(parsed);
  const status = record?.status;
  const summary = record?.summary;
  const artifacts = parseArtifacts(record?.artifacts);
  const handoff = parseHandoff(record?.handoff);
  const next = asStringArray(record?.next);

  if (
    !record ||
    typeof status !== "string" ||
    !VALID_STATUSES.has(status as CmdinoResultStatus) ||
    typeof summary !== "string" ||
    !artifacts ||
    !handoff ||
    !next
  ) {
    return {
      ok: false,
      reason: "invalid_shape",
      rawBlock,
      errorMessage: "CMDINO_RESULT must include status, summary, artifacts, handoff, and next.",
    };
  }

  return {
    ok: true,
    rawBlock,
    result: {
      status: status as CmdinoResultStatus,
      summary,
      artifacts,
      handoff,
      next,
      needsUserAction: status === "needs_user_action",
      rawJson: parsed,
    },
  };
}
