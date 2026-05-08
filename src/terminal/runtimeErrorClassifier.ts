import type { RuntimeErrorInfo, RuntimeErrorKind, RuntimeErrorSource } from "../domain/runtimeError";

// Windows CMD: "is not recognized as an internal or external command"
// DO NOT use ^ anchor — ConPTY delivers cursor movement via ANSI escapes, not \n.
// After stripAnsi those escape sequences vanish, leaving no \n for ^ to anchor to.
const RE_CMD_NOT_FOUND   = /is not recognized as an internal or external command/i;
// Second line of Windows CMD error — equally specific
const RE_CMD_BATCH       = /operable program or batch file/i;
// PowerShell (no ^ anchor, same reason)
const RE_PS_NOT_FOUND    = /is not recognized as the name of a cmdlet/i;
// Spawn-level (process launch failure messages from OS)
const RE_SPAWN_NOT_FOUND = /program not found|cannot find the file specified/i;

// Connection / service — includes Windows "actively refused" (ECONNREFUSED equivalent)
const RE_SERVICE = [
  /ECONNREFUSED/,
  /actively refused/i,      // Windows: "target machine actively refused it"
  /connection refused/i,
  /failed to connect/i,
  /could not connect/i,
  /ollama server not running/i,
  /couldn't connect to ollama/i,
  /connect ECONNREFUSED/i,
];

// Auth — only in clear failure context
const RE_AUTH = [
  /not authenticated/i,
  /login required/i,
  /please log[ -]?in/i,
  /missing api.?key/i,
  /invalid api.?key/i,
  /credentials not found/i,
  /authentication required/i,
];

// Permission
const RE_PERM = [
  /permission denied/i,
  /access is denied/i,
  /operation not permitted/i,
  /EACCES/,
  /EPERM/,
];

// Timeout — only explicit messages
const RE_TIMEOUT = [
  /ETIMEDOUT/,
  /connection timed out/i,
  /request timed out/i,
  /timeout exceeded/i,
  /timed out/i,
];

function test(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function isCmdNotFound(text: string): boolean {
  return RE_CMD_NOT_FOUND.test(text)
    || RE_CMD_BATCH.test(text)
    || RE_PS_NOT_FOUND.test(text);
}

// Ollama local API URL — used to anchor generic EOF/connection patterns
const RE_OLLAMA_URL = /(?:127\.0\.0\.1|localhost):11434/;

/**
 * Detect Ollama-specific local API failures.
 * Conservative: only fires when the local API URL is present OR the error is
 * an exact Go HTTP client error form tied to the Ollama endpoint.
 * Does NOT classify generic EOF alone.
 */
function isOllamaServiceError(text: string): boolean {
  // Exact Go HTTP client error form: Post "http://127.0.0.1:11434/api/...": EOF
  if (/(?:Post|Get) "https?:\/\/(?:127\.0\.0\.1|localhost):11434[^"]*"[^:]*:\s*EOF/i.test(text)) return true;
  // Same form with connection reset
  if (/(?:Post|Get) "https?:\/\/(?:127\.0\.0\.1|localhost):11434[^"]*"[^:]*:\s*(?:connection refused|read: connection reset by peer|server closed)/i.test(text)) return true;
  // URL present + EOF/connection failure keywords
  if (RE_OLLAMA_URL.test(text) && /\bEOF\b/.test(text)) return true;
  if (RE_OLLAMA_URL.test(text) && /server closed the connection/i.test(text)) return true;
  if (RE_OLLAMA_URL.test(text) && /connection reset by peer/i.test(text)) return true;
  return false;
}

function buildOllama(source: RuntimeErrorSource): RuntimeErrorInfo {
  return {
    kind:       "service_unavailable",
    source,
    confidence: "high",
    title:      "Ollama unavailable",
    message:    "CMDino could not reach the local Ollama service.",
    nextAction: "Start Ollama and retry, or open the Health panel.",
    occurredAt: Date.now(),
  };
}

const KIND_META: Record<RuntimeErrorKind, { title: string; message: string; nextAction: string }> = {
  command_not_found: {
    title:      "Command not found",
    message:    "The command could not be found on this system.",
    nextAction: "Check the command or open Agent Settings.",
  },
  auth_required: {
    title:      "Authentication required",
    message:    "The agent needs credentials or a login before it can run.",
    nextAction: "Open the Health panel to check provider status, or run the login command.",
  },
  service_unavailable: {
    title:      "Local service unavailable",
    message:    "Could not connect to the required local service.",
    nextAction: "Check that the service is running, then retry.",
  },
  process_exited: {
    title:      "Process ended",
    message:    "The process ended unexpectedly.",
    nextAction: "Check the terminal output for details, then restart if needed.",
  },
  spawn_failed: {
    title:      "Could not start process",
    message:    "CMDino could not launch the terminal process.",
    nextAction: "Check agent settings and try again.",
  },
  permission_denied: {
    title:      "Permission denied",
    message:    "Access was refused by the system.",
    nextAction: "Check file or command permissions, then retry.",
  },
  cwd_invalid: {
    title:      "Working directory not found",
    message:    "The configured working directory does not exist.",
    nextAction: "Update the working directory in agent settings.",
  },
  timeout: {
    title:      "Request timed out",
    message:    "The operation took too long and was stopped.",
    nextAction: "Check network or service health, then retry.",
  },
  unknown_runtime_error: {
    title:      "Process ended unexpectedly",
    message:    "CMDino could not determine the exact cause.",
    nextAction: "Check the terminal output for details.",
  },
};

function build(
  kind:       RuntimeErrorKind,
  source:     RuntimeErrorSource,
  confidence: "high" | "medium" | "low",
  rawSummary?: string,
  exitCode?:   number | null,
): RuntimeErrorInfo {
  const { title, message, nextAction } = KIND_META[kind];
  return { kind, source, confidence, title, message, nextAction, rawSummary, exitCode, occurredAt: Date.now() };
}

/** Classify a spawn rejection string (from terminalBridge.spawn throw or restart throw). */
export function classifySpawnError(msg: string): RuntimeErrorInfo {
  if (/cwd|working directory|no such file or directory/i.test(msg)) {
    return build("cwd_invalid", "spawn", "high", msg);
  }
  if (test(msg, RE_PERM)) {
    return build("permission_denied", "spawn", "high", msg);
  }
  if (isCmdNotFound(msg) || RE_SPAWN_NOT_FOUND.test(msg)) {
    return build("command_not_found", "spawn", "high", msg);
  }
  return build("spawn_failed", "spawn", "high", msg);
}

/**
 * Classify output observed while the PTY is alive.
 * Only returns HIGH-confidence matches to avoid false positives during normal operation.
 * Caller should pass a recent slice of normalised (ANSI-stripped) output.
 *
 * NOTE: Do not use ^ multiline anchors here. ConPTY on Windows delivers
 * cursor movement as ANSI sequences; after stripAnsi() those are gone and
 * the text has no reliable \n boundaries for ^ to anchor to.
 */
export function classifyOutputWhileRunning(recentOutput: string): RuntimeErrorInfo | null {
  if (isCmdNotFound(recentOutput)) {
    return build("command_not_found", "output", "high");
  }
  if (isOllamaServiceError(recentOutput)) {
    return buildOllama("output");
  }
  if (test(recentOutput, RE_SERVICE)) {
    return build("service_unavailable", "output", "high");
  }
  return null;
}

/**
 * Classify recent output after the process has already stopped.
 * Broader pattern set; lower false-positive risk because we know the process failed.
 * Caller should pass a recent slice of normalised output.
 */
export function classifyOutputAfterExit(recentOutput: string): RuntimeErrorInfo | null {
  if (isCmdNotFound(recentOutput)) {
    return build("command_not_found", "output", "high");
  }
  if (isOllamaServiceError(recentOutput)) {
    return buildOllama("output");
  }
  if (test(recentOutput, RE_SERVICE)) {
    return build("service_unavailable", "output", "high");
  }
  if (test(recentOutput, RE_AUTH)) {
    return build("auth_required", "output", "medium");
  }
  if (test(recentOutput, RE_PERM)) {
    return build("permission_denied", "output", "medium");
  }
  if (test(recentOutput, RE_TIMEOUT)) {
    return build("timeout", "output", "medium");
  }
  return null;
}

/**
 * Build an error from a terminal:exit event.
 * Returns null for killed (intentional), a calm process_exited for clean exits,
 * and unknown_runtime_error for backend error exits.
 */
export function classifyExitEvent(
  reason:   "exited" | "killed" | "error",
  exitCode: number | null,
): RuntimeErrorInfo | null {
  if (reason === "killed") return null;
  if (reason === "exited") return build("process_exited", "exit", "medium", undefined, exitCode);
  return build("unknown_runtime_error", "exit", "medium", undefined, exitCode);
}
