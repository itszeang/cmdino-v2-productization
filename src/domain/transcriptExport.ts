import type { TerminalAgent } from "./terminalAgent";

export interface TranscriptFile {
  fileName: string;
  content: string;
  agentConfigId: string;
}

export interface BuildTranscriptFilesInput {
  workspaceName: string;
  agents: TerminalAgent[];
  generatedAt: number;
  getTranscriptForAgent: (agentId: string) => string;
}

const CANONICAL_KINDS: Record<string, string> = {
  claude: "CLAUDE_TRANSCRIPT.md",
  codex:  "CODEX_TRANSCRIPT.md",
  gemini: "GEMINI_TRANSCRIPT.md",
  ollama: "OLLAMA_TRANSCRIPT.md",
};

function sanitizeLabel(label: string): string {
  const clean = label
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "AGENT";
}

function fmtTs(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

// Mirrors terminalIntelligence BLOCK_ESC_RE — comprehensive CSI/OSC/2-char ESC stripping
const BLOCK_ESC_RE =
  /\x1b(?:\[[0-9;?]*[ -/]*[@-~]|\][^\x07\x1b]*(?:\x07|\x1b\\)|[@-Z\\-_])/g;

// ── Spinner word list ─────────────────────────────────────────────────────────
// Every word here is also expanded into a prefix table below.
const SPINNER_WORD_LIST = [
  "Analyzing", "Amalgamating", "Booting", "Billowing", "Caramelizing",
  "Coalescing", "Cogitating", "Compiling", "Computing", "Contemplating",
  "Deliberating", "Distilling", "Elucidating", "Executing", "Fetching",
  "Formatting", "Generating", "Initializing", "Loading", "Mulling",
  "Noodling", "Percolating", "Processing", "Reasoning", "Reflecting",
  "Ruminating", "Searching", "Starting", "Summarizing", "Synthesizing",
  "Thinking", "Working",
];

const SPINNER_WORDS_RE = new RegExp(
  `^\\s*(${SPINNER_WORD_LIST.join("|")})\\s*[.,!?…]*\\s*$`, "i"
);

// All 2-to-(word.length-1) char prefixes of every spinner word, stored lowercase.
// Used to catch progressive redraw fragments: Bo, Boo, Boot, Wo, Wor, Work, etc.
const SPINNER_PREFIXES = new Set<string>();
for (const word of SPINNER_WORD_LIST) {
  for (let i = 2; i < word.length; i++) {
    SPINNER_PREFIXES.add(word.slice(0, i).toLowerCase());
  }
}

// ── Substring blacklist ───────────────────────────────────────────────────────
// Lines CONTAINING any of these substrings are noise regardless of other content.
const NOISE_SUBSTRINGS = [
  "[CAVEMAN]",
  "IDE extension install",
  "Skipped loading",
  "invalid SKILL.md",
  "SKILL.md",
  "Find and fix a bug in @",
  "Tip: Use /mcp",
  "Tip: use /mcp",
  "Accessing workspace",
  "Quick safety check",
  "Welcome to Claude Code",
  "welcome to claude code",
];

// ── Regex filters ─────────────────────────────────────────────────────────────

// Unicode box-drawing U+2500-U+257F plus ASCII decorators — catches ─═━│╔╗╚╝╭╯ etc.
const SEPARATOR_RE = /^\s*[─-╿=\-*_~|+]{5,}\s*$/;

// Repeated partial-word fragments: WorkWork, WoWoWo (same substr ×3+)
const REPEAT_FRAG_RE = /^([A-Za-z]{2,8})\1{2,}$/;

// Lines of only braille/block spinner glyphs (with optional whitespace)
const SPINNER_GLYPH_RE = /^[\s⠀-⣿◐◑◒◓●○▪▫]+$/;

// ── Primary noise detector ────────────────────────────────────────────────────

const REPAINT_PREFIXES = new Set<string>([
  "bo", "boo", "boot", "booti", "bootin",
  "wo", "wor", "work", "worki", "workin",
  "mc",
  "co", "cod", "code",
  "cl", "cla", "clau", "claud",
]);

const REPAINT_ANCHOR_RE = /\b(booting|server|working|mcp|codex|claude)\b|ooting/i;

function isProtectedTranscriptLine(trimmed: string): boolean {
  return trimmed.startsWith("\u203a");
}

function compactForFragmentCompare(line: string): string {
  return line.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function maxAffixOverlap(a: string, b: string): number {
  const max = Math.min(a.length, b.length);
  for (let size = max; size >= 1; size--) {
    if (a.endsWith(b.slice(0, size)) || b.endsWith(a.slice(0, size))) return size;
  }
  return 0;
}

function hasRepaintAnchor(line: string): boolean {
  const t = line.trim();
  if (REPAINT_ANCHOR_RE.test(t)) return true;
  return REPAINT_PREFIXES.has(t.toLowerCase());
}

function isShortRepaintFragment(line: string): boolean {
  const t = line.trim();
  if (!t || isProtectedTranscriptLine(t)) return false;
  if (t.length >= 24) return false;
  if (/^[>$#]/.test(t)) return false;
  if (/^[A-Za-z]:[\\/]/.test(t)) return false;
  if (/[.!?;]/.test(t)) return false;

  const words = t.replace(/:/g, " ").split(/\s+/).filter(Boolean);
  if (words.length > 3) return false;

  const lower = t.toLowerCase();
  if (lower === "mcp") return true;
  if (REPAINT_PREFIXES.has(lower)) return true;
  if (/^booting\s+(m|mc)$/i.test(t)) return true;
  if (/^ooting\s+mcp?$/i.test(t)) return true;
  if (/^server:\s*(co|cod|code|cl|cla|clau|claud)$/i.test(t)) return true;
  if (/^[A-Za-z]{2,7}$/.test(t) && SPINNER_PREFIXES.has(lower)) return true;

  return false;
}

function areProgressiveFragments(prevLine: string, nextLine: string): boolean {
  const prev = prevLine.trim();
  const next = nextLine.trim();
  if (!prev || !next) return false;
  if (isProtectedTranscriptLine(prev) || isProtectedTranscriptLine(next)) return false;
  if (prev.length >= 40 || next.length >= 40) return false;
  if (!hasRepaintAnchor(prev) && !hasRepaintAnchor(next)) return false;

  const a = compactForFragmentCompare(prev);
  const b = compactForFragmentCompare(next);
  if (a.length < 2 || b.length < 2) return false;

  const shorter = Math.min(a.length, b.length);
  if (a.startsWith(b) || b.startsWith(a) || a.endsWith(b) || b.endsWith(a)) return true;
  if (a.includes(b) || b.includes(a)) return shorter >= 4;

  const overlap = maxAffixOverlap(a, b);
  return overlap >= Math.max(4, Math.ceil(shorter * 0.65));
}

function pickFragmentChainSurvivor(chain: string[]): string | null {
  const meaningful = chain.filter((line) => !isShortRepaintFragment(line));
  if (meaningful.length === 0) return null;

  return meaningful.reduce((best, line) => {
    const bestLen = best.trim().length;
    const lineLen = line.trim().length;
    return lineLen >= bestLen ? line : best;
  });
}

function collapseProgressiveRepaintFragments(lines: string[]): string[] {
  const out: string[] = [];
  let chain: string[] = [];

  const flush = () => {
    if (chain.length === 0) return;
    if (chain.length === 1) {
      if (!isShortRepaintFragment(chain[0])) out.push(chain[0]);
      chain = [];
      return;
    }

    const survivor = pickFragmentChainSurvivor(chain);
    if (survivor) out.push(survivor);
    chain = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      out.push(line);
      continue;
    }

    const prev = chain[chain.length - 1];
    if (!prev || areProgressiveFragments(prev, line)) {
      chain.push(line);
    } else {
      flush();
      chain.push(line);
    }
  }

  flush();
  return out;
}

function isNoiseLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false; // blanks handled by caller
  if (isProtectedTranscriptLine(t)) return false;

  // Substring blacklist — fast path
  for (const sub of NOISE_SUBSTRINGS) {
    if (t.includes(sub)) return true;
  }

  // Separator / box-drawing only lines
  if (SEPARATOR_RE.test(t)) return true;

  // Bare spinner word (with optional trailing punctuation)
  if (SPINNER_WORDS_RE.test(t)) return true;

  // Bullet+status spinner: "• Working (11s · esc to interrupt)"
  if (/^\s*[•·]\s*\w+\s*\(\d+s/i.test(t)) return true;

  // Token/timing fragments: "(11s · 42 tokens)"
  if (/\(\d+s[\s·•,]*\d+[\s]*tokens?\)/i.test(t) && t.length < 40) return true;

  // "esc to interrupt" noise
  if (/esc to interrupt/i.test(t) && t.length < 35) return true;

  // Model/env status bar: "claude-sonnet-4-6 high · ~\path"
  if (/^\s*(gpt|claude|gemini|llama|ollama|mistral)[\w.\-]+/i.test(t)) return true;

  // Braille/block spinner-only lines
  if (SPINNER_GLYPH_RE.test(t)) return true;

  // Repeated partial-word fragments: WorkWork, WoWo
  if (REPEAT_FRAG_RE.test(t)) return true;

  // Short progressive repaint fragments that slipped through CR cleanup.
  if (isShortRepaintFragment(t)) return true;

  // VT100 alternate-screen / DA artifacts: [>0q  [?1049h  etc.
  if (/^\[[\d>?=!]*[A-Za-z]/.test(t)) return true;

  // Single char redraw fragment
  if (t.length === 1) return true;

  // Short pure-letter lines that are progressive redraw prefixes: Bo, Boo, Wo, Wor, Eluc, etc.
  if (t.length >= 2 && t.length <= 7 && /^[A-Za-z]+$/.test(t) && SPINNER_PREFIXES.has(t.toLowerCase())) return true;

  return false;
}

function cleanTranscript(raw: string): string {
  // CR+LF → LF; bare CR overwrite → drop everything before last \r on the line
  let s = raw.replace(/\r\n/g, "\n");
  s = s.replace(/[^\n]*\r/g, "");

  // Comprehensive ANSI/VT escape stripping (mirrors terminalIntelligence cleanForBlock)
  s = s.replace(BLOCK_ESC_RE, "");
  s = s.replace(/\x1b/g, "");                    // lone ESC survivors
  s = s.replace(/\[[\d>?=!]*[A-Za-z]/g, "");     // [51X / [>0q bracket artifacts
  s = s.replace(/\d{3,}[hl]/g, "");              // DEC mode params: 2026h, 2026l
  // eslint-disable-next-line no-control-regex
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "");

  // Line-level noise filter + consecutive-duplicate collapse
  const lines = collapseProgressiveRepaintFragments(s.split("\n"));
  const kept: string[] = [];
  let blankRun   = 0;
  let lastNonBlank = "";

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (kept.length > 0 && blankRun < 2) { kept.push(""); blankRun++; }
      lastNonBlank = "";
      continue;
    }

    blankRun = 0;
    if (isNoiseLine(line)) continue;

    // Drop consecutive identical non-blank lines (duplicate banners / repeated prompts)
    if (trimmed === lastNonBlank) continue;
    lastNonBlank = trimmed;
    kept.push(line);
  }

  while (kept.length > 0 && !kept[kept.length - 1].trim()) kept.pop();
  return kept.join("\n").trimEnd();
}

function buildTranscriptContent(
  agent:         TerminalAgent,
  workspaceName: string,
  generatedAt:   number,
  rawTranscript: string,
): string {
  const cleaned = cleanTranscript(rawTranscript);
  const outputBlock = cleaned.trim().length > 0
    ? cleaned
    : "No buffered terminal output captured for this agent yet.";

  return `# CMDino Terminal Transcript - ${agent.label}

Generated: ${fmtTs(generatedAt)}
Workspace: ${workspaceName}

## Agent
- Label: ${agent.label}
- Kind: ${agent.agentKind ?? "custom"}
- Config ID: ${agent.configId}

## Launch Context
- Command: \`${agent.launchCommand ?? "(not set)"}\`
- Working directory: \`${agent.cwd ?? "(not set)"}\`

## Transcript Notes
- Generated locally by CMDino.
- This is buffered terminal output, not an AI summary.
- Output may be truncated to the latest buffered 200 KB.
- ANSI/control cleanup is best-effort.

## Raw Terminal Output

\`\`\`text
${outputBlock}
\`\`\`
`;
}

export function buildTranscriptFiles(input: BuildTranscriptFilesInput): TranscriptFile[] {
  const { workspaceName, agents, generatedAt, getTranscriptForAgent } = input;

  const kindCount = new Map<string, number>();
  for (const agent of agents) {
    const k = (agent.agentKind ?? "custom").toLowerCase();
    kindCount.set(k, (kindCount.get(k) ?? 0) + 1);
  }

  const usedFileNames = new Set<string>();

  return agents.map((agent) => {
    const kind = (agent.agentKind ?? "custom").toLowerCase();
    const canonical = CANONICAL_KINDS[kind];
    let fileName: string;

    if (canonical && (kindCount.get(kind) ?? 0) === 1) {
      fileName = canonical;
    } else {
      fileName = `${sanitizeLabel(agent.label)}_TRANSCRIPT.md`;
    }

    if (usedFileNames.has(fileName)) {
      const suffix = agent.configId.slice(0, 6).toUpperCase();
      fileName = fileName.replace("_TRANSCRIPT.md", `_${suffix}_TRANSCRIPT.md`);
    }
    usedFileNames.add(fileName);

    const rawTranscript = getTranscriptForAgent(agent.id);
    const content = buildTranscriptContent(agent, workspaceName, generatedAt, rawTranscript);
    return { fileName, content, agentConfigId: agent.configId };
  });
}
