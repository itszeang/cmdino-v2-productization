import type { ProjectWorkspace } from "../domain/projectWorkspace";

interface ProjectOpenScreenProps {
  recentProjects: ProjectWorkspace[];
  onSelectFolder: () => void;
  onOpenRecent: (project: ProjectWorkspace) => void;
  onRemoveRecent: (projectId: string) => void;
  onContinueWithoutProject?: () => void;
}

function formatOpenedAt(ts: number): string {
  const delta = Date.now() - ts;
  if (delta < 60_000) return "just now";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)}m ago`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)}h ago`;
  return `${Math.floor(delta / 86_400_000)}d ago`;
}

export function ProjectOpenScreen({
  recentProjects,
  onSelectFolder,
  onOpenRecent,
  onRemoveRecent,
  onContinueWithoutProject,
}: ProjectOpenScreenProps) {
  return (
    <div className="project-open">
      <section className="project-open-panel soft-enter">
        <div className="project-open-mark">$_</div>
        <div className="project-open-copy">
          <span className="project-open-kicker">Project Workspace</span>
          <h1 className="project-open-title">Open a Project Workspace</h1>
          <p className="project-open-subtitle">
            Choose the local code folder where your AI agent team will work.
          </p>
          <p className="project-open-note">
            CMDino sessions store agent layout and outputs separately. The project folder is the real repo agents start inside.
          </p>
        </div>

        <div className="project-open-actions">
          <button className="project-open-primary" onClick={onSelectFolder}>
            Select Project Folder
          </button>
          {onContinueWithoutProject && (
            <button className="project-open-secondary" onClick={onContinueWithoutProject}>
              Continue Without Project
            </button>
          )}
        </div>

        <div className="project-open-recent">
          <div className="project-open-section-title">Recent Projects</div>
          {recentProjects.length === 0 ? (
            <div className="project-open-empty">No recent project folders yet.</div>
          ) : (
            <div className="project-open-list">
              {recentProjects.map((project) => (
                <div key={project.id} className="project-open-row">
                  <button className="project-open-row-main" onClick={() => onOpenRecent(project)}>
                    <span className="project-open-row-name">{project.name}</span>
                    <span className="project-open-row-path">{project.rootPath}</span>
                  </button>
                  <span className="project-open-row-time">{formatOpenedAt(project.lastOpenedAt)}</span>
                  <button
                    className="project-open-remove"
                    onClick={() => onRemoveRecent(project.id)}
                    title={`Remove ${project.name} from recent projects`}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

