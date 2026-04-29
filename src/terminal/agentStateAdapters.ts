import type { AgentKind } from "../domain/agentKind";
import type { AgentActivity, AgentAdapterInput } from "./agentActivity";

export interface AgentStateAdapter {
  kind: AgentKind;
  classify(input: AgentAdapterInput): AgentActivity | null;
}

function any(patterns: RegExp[], text: string): boolean {
  return patterns.some((p) => p.test(text));
}

// ── Claude adapter ────────────────────────────────────────────────────────────
// Matches Claude CLI tool-call format: ToolName( …
// Approval prompts use Claude's specific UX copy.

const CL_ASKING: RegExp[] = [
  /\bdo you want to\b/i,
  /\bwould you like to\b/i,
  /yes,?\s+and\s+don'?t\s+ask\s+again/i,
  /no,?\s+and\s+tell\s+claude/i,
  /\ballow\s+this\s+(?:command|tool)\b/i,
];

const CL_EDITING: RegExp[] = [
  /\b(?:Edit|MultiEdit|Write|NotebookEdit)\s*\(/,
];

const CL_RUNNING: RegExp[] = [
  /\b(?:Read|Bash|Grep|Glob|LS|TodoWrite|TodoRead)\s*\(/,
];

const CL_WAITING: RegExp[] = [
  /\bPress\s+Enter\s+to\s+continue\b/i,
];

const CL_STREAMING: RegExp[] = [
  /\bThinking\.\.\./,
];

const claudeAdapter: AgentStateAdapter = {
  kind: "claude",
  classify({ normalizedChunk }: AgentAdapterInput): AgentActivity | null {
    if (any(CL_ASKING,     normalizedChunk)) return "asking_approval";
    if (any(CL_WAITING,    normalizedChunk)) return "waiting_for_user";
    if (any(CL_EDITING,    normalizedChunk)) return "editing_files";
    if (any(CL_RUNNING,    normalizedChunk)) return "running_tool";
    if (any(CL_STREAMING,  normalizedChunk)) return "streaming_response";
    return null;
  },
};

// ── Codex adapter ─────────────────────────────────────────────────────────────

const CO_ASKING: RegExp[] = [
  /\bapproval\s+required\b/i,
  /\ballow\s+command\b/i,
  /\brun\s+outside\s+the\s+sandbox\b/i,
  /\brequires?\s+approval\b/i,
];

const CO_EDITING: RegExp[] = [
  /\bapply_patch\b/,
];

const CO_RUNNING: RegExp[] = [
  /\bshell_command\b/,
  /\bupdate_plan\b/,
  /\brunning\s+command\b/i,
];

const CO_WAITING: RegExp[] = [
  /\bconfirmation\s+required\b/i,
  /\b(?:y\/n|yes\/no)\b/i,
];

const codexAdapter: AgentStateAdapter = {
  kind: "codex",
  classify({ normalizedChunk }: AgentAdapterInput): AgentActivity | null {
    if (any(CO_ASKING,  normalizedChunk)) return "asking_approval";
    if (any(CO_WAITING, normalizedChunk)) return "waiting_for_user";
    if (any(CO_EDITING, normalizedChunk)) return "editing_files";
    if (any(CO_RUNNING, normalizedChunk)) return "running_tool";
    return null;
  },
};

// ── Gemini adapter ────────────────────────────────────────────────────────────

const GE_ASKING: RegExp[] = [
  /\ballow\s+this\s+command\b/i,
  /\bdo you want to\s+continue\b/i,
];

const GE_EDITING: RegExp[] = [
  /\bWriteFile\b/,
  /\bEditFile\b/,
];

const GE_RUNNING: RegExp[] = [
  /\bTool\s+call:/i,
  /\bShellCommand\b/,
  /\bReadFile\b/,
];

const GE_WAITING: RegExp[] = [
  /[❯›]\s*(?:Yes|No|Allow|Deny)\b/,
];

const GE_STREAMING: RegExp[] = [
  /\bThinking\.\.\./,
];

const geminiAdapter: AgentStateAdapter = {
  kind: "gemini",
  classify({ normalizedChunk }: AgentAdapterInput): AgentActivity | null {
    if (any(GE_ASKING,    normalizedChunk)) return "asking_approval";
    if (any(GE_WAITING,   normalizedChunk)) return "waiting_for_user";
    if (any(GE_EDITING,   normalizedChunk)) return "editing_files";
    if (any(GE_RUNNING,   normalizedChunk)) return "running_tool";
    if (any(GE_STREAMING, normalizedChunk)) return "streaming_response";
    return null;
  },
};

// ── Custom adapter ────────────────────────────────────────────────────────────
// Always returns null — generic terminal intelligence handles everything.

const customAdapter: AgentStateAdapter = {
  kind: "custom",
  classify(): AgentActivity | null {
    return null;
  },
};

// ── Registry ──────────────────────────────────────────────────────────────────

const REGISTRY: Record<AgentKind, AgentStateAdapter> = {
  claude: claudeAdapter,
  codex:  codexAdapter,
  gemini: geminiAdapter,
  ollama: customAdapter,
  custom: customAdapter,
};

export function classifyAgentOutput(
  kind: AgentKind,
  input: AgentAdapterInput,
): AgentActivity | null {
  try {
    return (REGISTRY[kind] ?? customAdapter).classify(input);
  } catch {
    return null;
  }
}
