import type { CmdinoWorkspaceFile } from "./workspace";

export type AgentCwdSource = "project" | "requested" | "fallback";
export type AgentCwdHealthStatus = "project" | "different" | "no_project";

export const DEFAULT_FALLBACK_AGENT_CWD = "C:\\Users\\burak";

export interface AgentCwdResolution {
  cwd: string;
  source: AgentCwdSource;
  warning?: string;
}

export interface AgentCwdHealth {
  status: AgentCwdHealthStatus;
  label: string;
  warning?: string;
}

function cleanPath(path?: string | null): string | null {
  const clean = path?.trim();
  return clean ? clean : null;
}

export function normalizeCwdPath(path: string): string {
  return path.trim().replace(/[\\/]+$/, "").toLowerCase();
}

export function pathsEqual(a?: string | null, b?: string | null): boolean {
  const left = cleanPath(a);
  const right = cleanPath(b);
  if (!left || !right) return false;
  return normalizeCwdPath(left) === normalizeCwdPath(right);
}

export function detectCwdMismatch(
  agentCwd: string | undefined,
  projectPath: string | undefined,
): boolean {
  if (!agentCwd || !projectPath) return false;
  return !pathsEqual(agentCwd, projectPath);
}

export function resolveAgentCwd(input: {
  selectedProjectRoot?: string | null;
  requestedCwd?: string | null;
  fallbackCwd?: string | null;
}): AgentCwdResolution {
  const selectedProjectRoot = cleanPath(input.selectedProjectRoot);
  const requestedCwd = cleanPath(input.requestedCwd);
  const fallbackCwd = cleanPath(input.fallbackCwd) ?? DEFAULT_FALLBACK_AGENT_CWD;

  if (selectedProjectRoot) {
    if (requestedCwd && !pathsEqual(requestedCwd, selectedProjectRoot)) {
      return {
        cwd: requestedCwd,
        source: "requested",
        warning: `This agent will run in "${requestedCwd}" instead of the selected project folder "${selectedProjectRoot}".`,
      };
    }
    return { cwd: selectedProjectRoot, source: "project" };
  }

  return {
    cwd: requestedCwd ?? fallbackCwd,
    source: requestedCwd ? "requested" : "fallback",
    warning: `No project folder is selected. This agent will run in "${requestedCwd ?? fallbackCwd}".`,
  };
}

export function resolveWorkspaceAgentCwds(
  workspace: CmdinoWorkspaceFile,
  input: {
    selectedProjectRoot?: string | null;
    fallbackCwd?: string | null;
  },
): CmdinoWorkspaceFile {
  return {
    ...workspace,
    terminals: workspace.terminals.map((terminal) => ({
      ...terminal,
      cwd: resolveAgentCwd({
        selectedProjectRoot: input.selectedProjectRoot,
        requestedCwd: terminal.cwd,
        fallbackCwd: input.fallbackCwd,
      }).cwd,
    })),
  };
}

export function getAgentCwdHealth(input: {
  agentCwd?: string | null;
  selectedProjectRoot?: string | null;
}): AgentCwdHealth {
  const selectedProjectRoot = cleanPath(input.selectedProjectRoot);
  const agentCwd = cleanPath(input.agentCwd);

  if (!selectedProjectRoot) {
    return {
      status: "no_project",
      label: "No project selected",
      warning: agentCwd
        ? `This agent is configured for "${agentCwd}", but no project folder is selected.`
        : "No project folder is selected. New agents will use the explicit fallback working directory.",
    };
  }

  if (agentCwd && pathsEqual(agentCwd, selectedProjectRoot)) {
    return { status: "project", label: "Project cwd" };
  }

  return {
    status: "different",
    label: "Different cwd",
    warning: `This agent is running outside the selected project workspace. Restart it in "${selectedProjectRoot}" for best results.`,
  };
}
