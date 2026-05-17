export type AgentRole =
  | "product_planner"
  | "architect"
  | "builder"
  | "reviewer"
  | "tester"
  | "summarizer"
  | "custom";

export type AgentProviderKind =
  | "claude"
  | "codex"
  | "gemini"
  | "ollama"
  | "custom";

export interface AgentTeamStep {
  id: string;
  label: string;
  role: AgentRole;
  preferredProvider: AgentProviderKind;
  required: boolean;
  outputContractId?: string;
}

export interface AgentTeam {
  id: string;
  name: string;
  shortLabel?: string;
  description: string;
  category?: "build" | "debug" | "ui" | "architecture" | "custom";
  recommended?: boolean;
  targetUser: "vibe_coder" | "developer" | "advanced";
  steps: AgentTeamStep[];
}

function providerLaunchCommand(provider: AgentProviderKind): string | undefined {
  if (provider === "claude") return "claude";
  if (provider === "codex") return "codex";
  if (provider === "gemini") return "gemini";
  if (provider === "ollama") return "ollama run llama3";
  return undefined;
}

function roleLabel(role: AgentRole): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function workflowStepsFromAgentTeam(team: AgentTeam) {
  return team.steps.map((step) => ({
    id: step.id,
    label: step.label,
    agentRole: step.role,
    preferredProvider: step.preferredProvider,
  }));
}

export function workspaceFromAgentTeam(team: AgentTeam) {
  const dinoIds = ["female-cole", "male-kira", "female-kira", "male-cole", "female-loki"];
  const terminals = team.steps.map((step, index) => ({
    configId: `team-${team.id}-${step.id}`,
    order: index,
    label: `${step.preferredProvider.charAt(0).toUpperCase()}${step.preferredProvider.slice(1)} ${roleLabel(step.role)}`,
    agentKind: step.preferredProvider,
    launchCommand: providerLaunchCommand(step.preferredProvider),
    cwd: undefined,
    dinoId: dinoIds[index % dinoIds.length],
    attachments: step.preferredProvider === "custom"
      ? []
      : [{
          id: `team-${team.id}-${step.id}-preset`,
          path: `cmdino-preset://${step.preferredProvider}`,
          fileName: `${step.preferredProvider.toUpperCase()}.md`,
        }],
  }));

  return {
    schemaVersion: 3 as const,
    workspaceName: team.name,
    terminals,
    workflowLinks: terminals.slice(0, -1).map((terminal, index) => ({
      id: `team-${team.id}-link-${index}`,
      sourceConfigId: terminal.configId,
      targetConfigId: terminals[index + 1].configId,
      kind: "route" as const,
      count: 1,
      updatedAt: 0,
    })),
    workflowNodePositions: Object.fromEntries(
      terminals.map((terminal, index) => [
        terminal.configId,
        { x: 80 + index * 200, y: index % 2 === 0 ? 160 : 260 },
      ]),
    ),
  };
}

export const DEFAULT_AGENT_TEAMS: AgentTeam[] = [
  {
    id: "vibe-app-builder",
    name: "Vibe App Builder",
    shortLabel: "Feature build",
    description: "Build a product feature from one task with planning, implementation, review, and summary checkpoints.",
    category: "build",
    recommended: true,
    targetUser: "vibe_coder",
    steps: [
      {
        id: "vibe-app-builder-product-plan",
        label: "Product Planner",
        role: "product_planner",
        preferredProvider: "claude",
        required: true,
        outputContractId: "product_plan",
      },
      {
        id: "vibe-app-builder-build",
        label: "Builder",
        role: "builder",
        preferredProvider: "codex",
        required: true,
        outputContractId: "implementation_result",
      },
      {
        id: "vibe-app-builder-review",
        label: "Reviewer",
        role: "reviewer",
        preferredProvider: "gemini",
        required: true,
        outputContractId: "review_notes",
      },
      {
        id: "vibe-app-builder-summary",
        label: "Summarizer",
        role: "summarizer",
        preferredProvider: "claude",
        required: false,
        outputContractId: "final_summary",
      },
    ],
  },
  {
    id: "bug-fix-team",
    name: "Bug Fix Team",
    shortLabel: "Debug and fix",
    description: "Analyze an error, plan a fix, review test risk, and summarize what changed.",
    category: "debug",
    targetUser: "developer",
    steps: [
      {
        id: "bug-fix-analyze",
        label: "Bug Analyzer",
        role: "reviewer",
        preferredProvider: "gemini",
        required: true,
        outputContractId: "bug_analysis",
      },
      {
        id: "bug-fix-build",
        label: "Fix Builder",
        role: "builder",
        preferredProvider: "codex",
        required: true,
        outputContractId: "fix_result",
      },
      {
        id: "bug-fix-test-review",
        label: "Test Reviewer",
        role: "tester",
        preferredProvider: "gemini",
        required: true,
        outputContractId: "test_review",
      },
      {
        id: "bug-fix-summary",
        label: "Summarizer",
        role: "summarizer",
        preferredProvider: "claude",
        required: false,
        outputContractId: "fix_summary",
      },
    ],
  },
  {
    id: "ui-polish-team",
    name: "UI Polish Team",
    shortLabel: "UX polish",
    description: "Improve UX, layout, copy, and visual quality with focused review checkpoints.",
    category: "ui",
    targetUser: "vibe_coder",
    steps: [
      {
        id: "ui-polish-ux-review",
        label: "UX Reviewer",
        role: "reviewer",
        preferredProvider: "claude",
        required: true,
        outputContractId: "ux_review",
      },
      {
        id: "ui-polish-frontend-build",
        label: "Frontend Builder",
        role: "builder",
        preferredProvider: "codex",
        required: true,
        outputContractId: "frontend_result",
      },
      {
        id: "ui-polish-visual-review",
        label: "Visual Reviewer",
        role: "reviewer",
        preferredProvider: "gemini",
        required: true,
        outputContractId: "visual_review",
      },
      {
        id: "ui-polish-summary",
        label: "Summarizer",
        role: "summarizer",
        preferredProvider: "claude",
        required: false,
        outputContractId: "polish_summary",
      },
    ],
  },
  {
    id: "architecture-team",
    name: "Architecture Team",
    shortLabel: "Plan systems",
    description: "Design a system or module before implementation with strategy and architecture checkpoints.",
    category: "architecture",
    targetUser: "advanced",
    steps: [
      {
        id: "architecture-strategy",
        label: "Product Strategist",
        role: "product_planner",
        preferredProvider: "claude",
        required: true,
        outputContractId: "product_strategy",
      },
      {
        id: "architecture-system",
        label: "System Architect",
        role: "architect",
        preferredProvider: "claude",
        required: true,
        outputContractId: "system_architecture",
      },
      {
        id: "architecture-implementation-plan",
        label: "Implementation Planner",
        role: "architect",
        preferredProvider: "codex",
        required: true,
        outputContractId: "implementation_plan",
      },
      {
        id: "architecture-summary",
        label: "Summarizer",
        role: "summarizer",
        preferredProvider: "claude",
        required: false,
        outputContractId: "architecture_summary",
      },
    ],
  },
];
