import type { ProjectWorkspace, ProjectWorkspaceSummary } from "./projectWorkspace";

const FALLBACK_PROJECT_NAME = "Untitled Project";

export function projectNameFromPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) return FALLBACK_PROJECT_NAME;

  const normalized = trimmed.replace(/[\\/]+$/, "");
  if (!normalized) return FALLBACK_PROJECT_NAME;

  const parts = normalized.split(/[\\/]+/).filter(Boolean);
  const last = parts[parts.length - 1];
  if (!last || /^[A-Za-z]:$/.test(last)) return FALLBACK_PROJECT_NAME;
  return last;
}

export function createUnknownProjectWorkspace(rootPath: string): ProjectWorkspace {
  const now = Date.now();
  const normalizedRoot = rootPath.trim();

  return {
    id: crypto.randomUUID(),
    name: projectNameFromPath(normalizedRoot),
    rootPath: normalizedRoot,
    createdAt: now,
    lastOpenedAt: now,
    detectedFramework: "unknown",
    packageManager: "unknown",
    gitDetected: false,
  };
}

export function summarizeProjectWorkspace(project: ProjectWorkspace): ProjectWorkspaceSummary {
  return {
    workspace: project,
    hasReadme: false,
    hasPackageJson: false,
    hasSrcDirectory: false,
    hasGitRepository: project.gitDetected,
  };
}

