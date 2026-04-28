import type { DinoState } from "./dinoStateMachine";

export const IDLE_AFTER_MS    = 1800;
export const HEAVY_WINDOW_MS  = 1200;
export const HEAVY_MIN_CHUNKS = 4;
export const HEAVY_MIN_CHARS  = 1200;

const ANSI_RE = /\x1b\[[0-9;]*[mGKHFJABCDsuhlc?]|\x1b\][^\x07]*\x07|\x1b[()][0-9A-Z]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

const FATAL_PATTERNS = [
  /\bfatal(?: error)?:/i,
  /\buncaught exception\b/i,
  /\bunhandled (?:exception|rejection)\b/i,
  /\btraceback \(most recent call last\):/i,
  /\bsegmentation fault\b/i,
  /\bpanic(?:ked)? at\b/i,
  /\bprocess exited with code [1-9]\d*\b/i,
  /\bexit code [1-9]\d*\b/i,
  /\bcommand failed with exit code [1-9]\d*\b/i,
  /\bfailed to (?:start|spawn|compile|build)\b/i,
  /\bpermission denied\b/i,
  /\bno such file or directory\b/i,
];

const SUCCESS_PATTERNS = [
  /\bbuild completed successfully\b/i,
  /\btests? passed\b/i,
  /\ball checks passed\b/i,
  /\bcompleted successfully\b/i,
  /\bsuccessfully (?:built|compiled|installed|completed)\b/i,
];

const HEAVY_PATTERNS = [
  /\bthinking\b/i,
  /\banalyzing\b/i,
  /\bprocessing\b/i,
  /\bsearching\b/i,
  /\bcompiling\b/i,
  /\bbuilding\b/i,
  /\bresolving\b/i,
  /\binstalling\b/i,
];

export interface BurstTracker {
  windowStart: number;
  chunkCount:  number;
  charCount:   number;
}

export function createBurstTracker(): BurstTracker {
  return { windowStart: 0, chunkCount: 0, charCount: 0 };
}

export function classifyStdoutChunk(raw: string, burst: BurstTracker): DinoState {
  const text = stripAnsi(raw);
  const now  = Date.now();

  for (const pat of FATAL_PATTERNS) {
    if (pat.test(text)) return "terminal_error";
  }

  for (const pat of SUCCESS_PATTERNS) {
    if (pat.test(text)) return "success_signal";
  }

  if (now - burst.windowStart > HEAVY_WINDOW_MS) {
    burst.windowStart = now;
    burst.chunkCount  = 0;
    burst.charCount   = 0;
  }
  burst.chunkCount++;
  burst.charCount += raw.length;

  if (burst.chunkCount >= HEAVY_MIN_CHUNKS || burst.charCount >= HEAVY_MIN_CHARS) {
    return "heavy_processing";
  }

  for (const pat of HEAVY_PATTERNS) {
    if (pat.test(text)) return "heavy_processing";
  }

  return "patrol_running";
}
