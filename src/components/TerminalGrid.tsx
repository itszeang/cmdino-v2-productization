import { TerminalPane } from "./TerminalPane";
import type { TerminalAgent } from "../domain/terminalAgent";

interface Props {
  agents: TerminalAgent[];
}

export function TerminalGrid({ agents }: Props) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${agents.length}, 1fr)`,
        gap: 10,
        height: "100%",
        padding: 10,
      }}
    >
      {agents.map((agent) => (
        <TerminalPane key={agent.id} agent={agent} />
      ))}
    </div>
  );
}
