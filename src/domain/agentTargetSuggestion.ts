import type { AgentRole } from "./agentTeam";

export interface TargetSuggestionAgent {
  id: string;
  label: string;
  kind?: string;
  isRunning?: boolean;
}

function normalized(value?: string): string {
  return value?.toLowerCase().replace(/[_-]+/g, " ").trim() ?? "";
}

function roleSearchTokens(role: string): string[] {
  const tokens = role.split(/\s+/).filter((token) => token && token !== "custom");
  const aliases: Record<string, string[]> = {
    builder: ["build"],
    planner: ["plan"],
    reviewer: ["review"],
    summarizer: ["summary", "summarize"],
    tester: ["test"],
    architect: ["architecture"],
  };

  return [...new Set(tokens.flatMap((token) => [token, ...(aliases[token] ?? [])]))];
}

export function suggestTargetAgentForStep(input: {
  agents: TargetSuggestionAgent[];
  preferredProvider?: string;
  role?: AgentRole | string;
}): string | null {
  const running = input.agents.filter((agent) => agent.isRunning);
  if (running.length === 0) return null;

  const provider = normalized(input.preferredProvider);
  const role = normalized(input.role);
  const roleTokens = roleSearchTokens(role);

  const isProviderMatch = (agent: TargetSuggestionAgent) => {
    if (!provider) return false;
    return normalized(agent.kind) === provider || normalized(agent.label).includes(provider);
  };
  const isRoleMatch = (agent: TargetSuggestionAgent) => {
    if (roleTokens.length === 0) return false;
    const label = normalized(agent.label);
    return roleTokens.some((token) => label.includes(token));
  };

  const providerAndRoleMatch = running.find((agent) => isProviderMatch(agent) && isRoleMatch(agent));
  if (providerAndRoleMatch) return providerAndRoleMatch.id;

  const roleMatch = running.find((agent) => isRoleMatch(agent));
  if (roleMatch) return roleMatch.id;

  if (roleTokens.length === 0) {
    const providerMatch = running.find((agent) => isProviderMatch(agent));
    if (providerMatch) return providerMatch.id;
  }

  return null;
}
