import type { DinoState } from "./dinoStateMachine";

// Strip ANSI escape sequences before matching
const ANSI_RE = /\x1b\[[0-9;]*[mGKHFJABCDsuhlc?]|\x1b\][^\x07]*\x07|\x1b[()][0-9A-Z]/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_RE, "");
}

interface VibeRule {
  pattern: RegExp;
  state: DinoState;
}

// Rules in priority order: error > success > thinking > review > running
const RULES: VibeRule[] = [
  {
    pattern: /error|failed|exception|traceback|cannot|denied|fatal/i,
    state: "terminal_error",
  },
  {
    pattern: /done|completed|success|finished|passed|all checks/i,
    state: "success_signal",
  },
  {
    pattern: /thinking|analyzing|processing|searching|loading|resolving/i,
    state: "heavy_processing",
  },
  {
    pattern: /review|scan|inspect/i,
    state: "review_scan",
  },
  {
    pattern: /running|executing|editing|writing|building|installing|compiling|deploying/i,
    state: "patrol_running",
  },
];

export function parseStdoutVibe(raw: string): DinoState | null {
  const text = stripAnsi(raw);
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return rule.state;
  }
  return null;
}
