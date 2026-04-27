import { useCallback, useState } from "react";
import type { TerminalAgent } from "../domain/terminalAgent";

export const MAX_TERMINALS = 4;

type NewAgent = Omit<TerminalAgent, "id">;

export function useTerminalAgents() {
  const [agents, setAgents] = useState<TerminalAgent[]>([]);

  const addAgent = useCallback((agent: NewAgent) => {
    setAgents((prev) => {
      if (prev.length >= MAX_TERMINALS) return prev;
      return [...prev, { ...agent, id: crypto.randomUUID() }];
    });
  }, []);

  const removeAgent = useCallback((id: string) => {
    setAgents((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return {
    agents,
    addAgent,
    removeAgent,
    count: agents.length,
    maxReached: agents.length >= MAX_TERMINALS,
  };
}
