import { TerminalPane } from "./TerminalPane";
import type { TerminalAgent } from "../domain/terminalAgent";

// Returns column count for a given pane count
function getCols(n: number): number {
  if (n === 1) return 1;
  if (n <= 2) return 2;
  if (n <= 3) return 3;
  if (n <= 4) return 2; // 2×2
  if (n <= 9) return 3; // up to 3×3
  return 4;             // 10-12 → rows of 4
}

interface Props {
  agents: TerminalAgent[];
  onRemove: (id: string) => void;
}

export function TerminalGrid({ agents, onRemove }: Props) {
  const n = agents.length;
  const cols = getCols(n);
  const rows = Math.ceil(n / cols);

  // ≤2 rows: stretch to fill viewport height.
  // 3+ rows: fixed 280px rows, outer wrapper scrolls.
  const needsScroll = rows >= 3;

  return (
    <div
      style={{
        height: "100%",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: needsScroll
            ? `repeat(${rows}, 280px)`
            : `repeat(${rows}, 1fr)`,
          gap: 10,
          // Explicit height only for non-scroll case so 1fr rows expand to fill.
          height: needsScroll ? "auto" : "calc(100% - 0px)",
          minHeight: "100%",
        }}
      >
        {agents.map((agent) => (
          <TerminalPane key={agent.id} agent={agent} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
