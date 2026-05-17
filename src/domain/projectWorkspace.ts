export interface ProjectWorkspace {
  id: string;
  name: string;
  rootPath: string;
  createdAt: number;
  lastOpenedAt: number;
  detectedFramework?: ProjectFramework;
  packageManager?: PackageManager;
  gitDetected: boolean;
}

export type ProjectFramework =
  | "vite"
  | "next"
  | "react"
  | "tauri"
  | "node"
  | "python"
  | "unknown";

export type PackageManager =
  | "npm"
  | "pnpm"
  | "yarn"
  | "bun"
  | "pip"
  | "unknown";

export interface ProjectWorkspaceSummary {
  workspace: ProjectWorkspace;
  hasReadme: boolean;
  hasPackageJson: boolean;
  hasSrcDirectory: boolean;
  hasGitRepository: boolean;
}

