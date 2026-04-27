import { TerminalPane } from "./TerminalPane";
import type { TerminalAgent } from "../domain/terminalAgent";

function gridColumns(count: number): string {
  if (count <= 2) return `repeat(${count}, 1fr)`;
  if (count === 3) return "repeat(3, 1fr)";
  return "repeat(2, 1fr)"; // 4 → 2×2
}

interface Props {
  agents: TerminalAgent[];
  onRemove: (id: string) => void;
}

export function TerminalGrid({ agents, onRemove }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: gridColumns(agents.length),
        gap: 10,
        height: "100%",
        padding: 10,
      }}
    >
      {agents.map((agent) => (
        <TerminalPane key={agent.id} agent={agent} onRemove={onRemove} />
      ))}
    </div>
  );
}
