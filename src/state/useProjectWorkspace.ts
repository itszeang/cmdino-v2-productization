import { useCallback, useState } from "react";
import type { ProjectWorkspace } from "../domain/projectWorkspace";

const RECENT_PROJECTS_KEY = "cmdino.v2.project_workspaces";
const CURRENT_PROJECT_KEY = "cmdino.v2.current_project_workspace";
const MAX_RECENT_PROJECTS = 12;

function isProjectWorkspace(value: unknown): value is ProjectWorkspace {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.name === "string" &&
    typeof record.rootPath === "string" &&
    typeof record.createdAt === "number" &&
    typeof record.lastOpenedAt === "number" &&
    typeof record.gitDetected === "boolean"
  );
}

function loadRecentProjects(): ProjectWorkspace[] {
  try {
    const raw = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(isProjectWorkspace).slice(0, MAX_RECENT_PROJECTS)
      : [];
  } catch {
    return [];
  }
}

function loadCurrentProject(): ProjectWorkspace | null {
  try {
    const raw = localStorage.getItem(CURRENT_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isProjectWorkspace(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function saveRecentProjects(projects: ProjectWorkspace[]): void {
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects.slice(0, MAX_RECENT_PROJECTS)));
  } catch {
    // Ignore storage quota/private-mode failures.
  }
}

function saveCurrentProject(project: ProjectWorkspace | null): void {
  try {
    if (project) localStorage.setItem(CURRENT_PROJECT_KEY, JSON.stringify(project));
    else localStorage.removeItem(CURRENT_PROJECT_KEY);
  } catch {
    // Ignore storage quota/private-mode failures.
  }
}

export function useProjectWorkspace(): {
  currentProject: ProjectWorkspace | null;
  recentProjects: ProjectWorkspace[];
  selectProject: (project: ProjectWorkspace) => void;
  clearCurrentProject: () => void;
  removeRecentProject: (id: string) => void;
} {
  const [currentProject, setCurrentProject] = useState<ProjectWorkspace | null>(loadCurrentProject);
  const [recentProjects, setRecentProjects] = useState<ProjectWorkspace[]>(loadRecentProjects);

  const selectProject = useCallback((project: ProjectWorkspace) => {
    const now = Date.now();
    const updated: ProjectWorkspace = {
      ...project,
      lastOpenedAt: now,
    };

    setCurrentProject(updated);
    saveCurrentProject(updated);

    setRecentProjects((prev) => {
      const existing = prev.find((item) => item.rootPath === updated.rootPath);
      const merged: ProjectWorkspace = existing
        ? { ...existing, ...updated, id: existing.id, createdAt: existing.createdAt }
        : updated;
      const next = [
        merged,
        ...prev.filter((item) => item.rootPath !== updated.rootPath),
      ].slice(0, MAX_RECENT_PROJECTS);
      saveRecentProjects(next);
      return next;
    });
  }, []);

  const clearCurrentProject = useCallback(() => {
    setCurrentProject(null);
    saveCurrentProject(null);
  }, []);

  const removeRecentProject = useCallback((id: string) => {
    setRecentProjects((prev) => {
      const next = prev.filter((project) => project.id !== id);
      saveRecentProjects(next);
      return next;
    });
    setCurrentProject((current) => {
      if (current?.id !== id) return current;
      saveCurrentProject(null);
      return null;
    });
  }, []);

  return {
    currentProject,
    recentProjects,
    selectProject,
    clearCurrentProject,
    removeRecentProject,
  };
}

