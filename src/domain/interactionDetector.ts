import type { AgentInteractionType, SuggestedInteractionAction } from "./agentInteraction";

export interface DetectedInteraction {
  type:             AgentInteractionType;
  excerpt:          string;
  suggestedActions: SuggestedInteractionAction[];
}

interface Pattern {
  regex:       RegExp;
  type:        AgentInteractionType;
  suggestions: SuggestedInteractionAction[];
}

const PATTERNS: Pattern[] = [
  // ── Numbered approval menus (Claude-style permission prompts) ────────────────
  // Matches: "allow once", "always allow", "1) allow", "2) allow"
  {
    regex: /allow\s+once|always\s+allow|1[.)]\s*allow|2[.)]\s*allow/i,
    type: "approval",
    suggestions: [
      { label: "Allow Once",    value: "1" },
      { label: "Always Allow",  value: "2" },
      { label: "Deny",          value: "3" },
    ],
  },

  // ── Yes/no — require bracket/paren format to avoid false positives ──────────
  // Matches: [y/n], [y/N], [Y/n], [Y/N], (y/n), (Y/N)
  {
    regex: /\[y\/n\]|\[y\/N\]|\[Y\/n\]|\[Y\/N\]|\(y\/n\)|\(Y\/N\)/i,
    type: "yes_no",
    suggestions: [
      { label: "Yes", value: "y" },
      { label: "No",  value: "n" },
    ],
  },

  // ── "proceed?" or "continue?" followed by y/n indicator ─────────────────────
  {
    regex: /(?:proceed|continue)\?\s*\[?[yn]\/[yN]\]?/i,
    type: "yes_no",
    suggestions: [
      { label: "Yes", value: "y" },
      { label: "No",  value: "n" },
    ],
  },

  // ── Press any key / press enter to continue ──────────────────────────────────
  {
    regex: /press\s+(?:any\s+key|enter)(?:\s+to\s+continue)?[.…\s]*$/im,
    type: "enter_to_continue",
    suggestions: [
      { label: "Press Enter", value: "" },
    ],
  },

  // ── Select / choose an option ────────────────────────────────────────────────
  {
    regex: /(?:select|choose)\s+an?\s+option/i,
    type: "selection",
    suggestions: [],
  },

  // ── Permission / approval required ──────────────────────────────────────────
  {
    regex: /(?:permission|approval)\s+required/i,
    type: "approval",
    suggestions: [],
  },
];

// Only scan the tail of the output buffer to avoid matching old content
const SCAN_TAIL_CHARS = 600;
const EXCERPT_MAX_CHARS = 220;

export function detectInteractionInOutput(output: string): DetectedInteraction | null {
  if (!output || !output.trim()) return null;

  const tail =
    output.length > SCAN_TAIL_CHARS
      ? output.slice(output.length - SCAN_TAIL_CHARS)
      : output;

  for (const pattern of PATTERNS) {
    const match = tail.match(pattern.regex);
    if (!match || match.index == null) continue;

    const start   = Math.max(0, match.index - 60);
    const end     = Math.min(tail.length, match.index + (match[0]?.length ?? 0) + 100);
    const excerpt = tail.slice(start, end).trim().slice(0, EXCERPT_MAX_CHARS);

    return {
      type:             pattern.type,
      excerpt,
      suggestedActions: pattern.suggestions,
    };
  }

  return null;
}
