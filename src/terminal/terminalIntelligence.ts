import type { DinoState } from "./dinoStateMachine";

export const IDLE_AFTER_MS    = 1800;
export const HEAVY_WINDOW_MS  = 1200;
export const HEAVY_MIN_CHUNKS = 4;
export const HEAVY_MIN_CHARS  = 1200;

const ANSI_RE = /\x1b\[[0-9;]*[mGKHFJABCDsuhlc?]|\x1b\][^\x07]*\x07|\x1b[()][0-9A-Z]/g;

export function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

// ── Forwarding block helpers ──────────────────────────────────────────────────
//
// Comprehensive CSI/OSC/2-char escape sequence regex — fixes gaps in ANSI_RE:
//   • ANSI_RE param set [0-9;]* misses '?' (DEC private marker), so
//     \x1b[?2026h → strips to \x1b[? and leaves "2026h" as literal text.
//   • ANSI_RE terminator set [mGKHFJABCDsuhlc?] misses X, P, @, etc., so
//     \x1b[51X → not stripped at all → leaves "[51X" after \x1b removal.
//   This regex covers the full CSI terminator range [@-~] and DEC ? params.
//   Order matters: CSI must be first so \x1b[ isn't consumed by the 2-char arm.
const BLOCK_ESC_RE =
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g;

/**
 * Deep clean for forwarding block accumulation:
 * - normalize CRLF/CR → LF (prevents line-overwrite artifacts)
 * - strip all escape sequences with comprehensive regex
 * - strip any remaining lone ESC bytes
 * - strip [NNX bracket-digit-letter artifacts left by partial stripping
 * - strip DEC mode param fragments like 2026h / 2026l
 * - strip remaining non-printable control chars (preserves \n and \t)
 */
export function cleanForBlock(raw: string): string {
  let s = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(BLOCK_ESC_RE, "");
  s = s.replace(/\x1b/g, "");               // lone ESC survivors
  s = s.replace(/\[\d+[A-Za-z]/g, "");      // [51X, [9X bracket artifacts
  s = s.replace(/\d{3,}[hl]/g, "");         // DEC param remnants: 2026h, 2026l
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");
  return s;
}

/**
 * Conservative whitelist-based line filter for Auto Forward.
 * Prefers false negatives: drops a line whenever meaningful-content
 * criteria are not clearly met. A blacklist can never keep up with
 * terminal TUI redraw artifacts; a whitelist can.
 */
function isKeepableLine(line: string): boolean {
  const t = line.trim();

  // ── hard-drop rules ────────────────────────────────────────────────────────

  // Too short to carry meaning
  if (t.length < 8) return false;

  // Token/timing status fragments: "*(1s 1 tokens)", "(11s · 42 tokens)"
  if (/\(\d+s[\s·•,]*\d+[\s]*tokens?\)/i.test(t)) return false;
  if (/^\*?\s*\(\d/.test(t)) return false;

  // CLI prompt/input lines: "› Run /review...", "❯ command"
  if (/^\s*[›❯⟩→]\s/.test(t)) return false;

  // Bullet+status spinners: "• Working (11s • esc to interrupt)"
  if (/^\s*[•·]\s*(Working|Thinking|Processing|Generating|Analyzing)/i.test(t)) return false;

  // Model/env status bar lines: "gpt-5.5 high · ~\path", "claude-sonnet-4-6"
  if (/^\s*(gpt|claude|gemini|llama|ollama|mistral)[\w.\-]+/i.test(t)) return false;

  // Known noise strings
  if (/esc to interrupt/i.test(t)) return false;
  if (/\[CAVEMAN\]/.test(t)) return false;
  if (/IDE extension install/i.test(t)) return false;
  if (/^\s*Run\s+\/\w+/i.test(t)) return false;
  if (/^\s*─{3,}\s*$/.test(t)) return false;
  if (/^\s*[=\-*_]{3,}\s*$/.test(t)) return false;

  // ── whitelist / content-quality checks ────────────────────────────────────

  // Must contain at least one real word (3+ consecutive alpha chars)
  if (!/[a-zA-Z]{3,}/.test(t)) return false;

  // Must be mostly alphabetic — ratio < 45% means symbols/numbers dominate
  const alphaCount = (t.match(/[a-zA-Z]/g) ?? []).length;
  if (alphaCount / t.length < 0.45) return false;

  // Single known status-verb on its own line (possibly with punctuation)
  if (/^\s*(Working|Processing|Caramelizing|Thinking|Generating|Analyzing|Searching|Summarizing)\s*[.,!?…]*\s*$/i.test(t)) return false;

  // Single word with no spaces, no programming punctuation, short → spinner/label
  if (!/\s/.test(t) && t.length < 15 && !/[(){}[\];:,.]/.test(t)) return false;

  // ── redraw fragment detection ──────────────────────────────────────────────
  // Terminal redraws produce a characteristic mix: very short alpha-tokens
  // (cursor fragments) alongside very long alpha-tokens (overwrite artifacts).
  // e.g. "Ca rCaamrealmi ez liinzging" — tiny: Ca, ez; veryLong: rCaamrealmi, liinzging
  const words = t.split(/\s+/).filter(Boolean);
  const alphaLen = (w: string) => w.replace(/[^a-zA-Z]/g, "").length;
  if (words.length >= 2) {
    const tiny     = words.filter((w) => alphaLen(w) <= 2).length;
    const veryLong = words.filter((w) => alphaLen(w) >= 9).length;
    if (words.length <= 3) {
      // For short lines: any mix of tiny + very-long is suspicious
      if (tiny >= 1 && veryLong >= 1 && tiny + veryLong === words.length) return false;
    } else {
      // For longer lines: drop if > 65% of words are tiny or very-long
      if (tiny >= 1 && veryLong >= 1 && (tiny + veryLong) / words.length > 0.65) return false;
    }
  }

  return true;
}

/**
 * Filter a cleaned block down to keepable lines.
 * Collapses consecutive blank lines (max 2). Returns "" if nothing survives.
 */
export function filterBlockLines(text: string): string {
  const lines = text.split("\n");
  const kept: string[] = [];
  let blankRun = 0;
  for (const line of lines) {
    if (!line.trim()) {
      if (kept.length > 0 && blankRun < 2) { kept.push(""); blankRun++; }
    } else {
      blankRun = 0;
      if (isKeepableLine(line)) kept.push(line);
    }
  }
  while (kept.length > 0 && !kept[kept.length - 1].trim()) kept.pop();
  return kept.join("\n").trim();
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
