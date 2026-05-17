import { useState } from "react";
import type { ProjectWorkspace } from "../domain/projectWorkspace";
import type { TerminalViewMode } from "../domain/viewMode";

interface MainHeaderProps {
  workspaceName:    string;
  onNameChange:     (name: string) => void;
  viewMode:         TerminalViewMode;
  onToggleViewMode: () => void;
  currentProject?:  ProjectWorkspace | null;
  onOpenProject?:   () => void;
  onClearProject?:  () => void;
}

export function MainHeader({
  workspaceName,
  onNameChange,
  viewMode,
  onToggleViewMode,
  currentProject,
  onOpenProject,
  onClearProject,
}: MainHeaderProps) {
  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState(workspaceName);

  function commitName() {
    setEditing(false);
    const trimmed = nameInput.trim() || "Untitled Workspace";
    setNameInput(trimmed);
    onNameChange(trimmed);
  }

  return (
    <header className="workspace-header">
      <div className="header-shell">

        {/* Left: workspace identity */}
        <div className="header-identity">
          <span className="header-kicker">workspace</span>
          {editing ? (
            <input
              className="header-name-input"
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitName();
                if (e.key === "Escape") { setEditing(false); setNameInput(workspaceName); }
              }}
            />
          ) : (
            <span
              className="header-name-display"
              onClick={() => { setNameInput(workspaceName); setEditing(true); }}
              title="Click to rename workspace"
            >
              {workspaceName}
            </span>
          )}
        </div>

        <div className="project-context-pill">
          <div className="project-context-copy">
            {currentProject ? (
              <>
                <span className="project-context-name">Project: {currentProject.name}</span>
                <span className="project-context-path" title={currentProject.rootPath}>
                  Agents start here by default: {currentProject.rootPath}
                </span>
              </>
            ) : (
              <>
                <span className="project-context-name">No project selected</span>
                <span className="project-context-path">Agents use their own working directory.</span>
              </>
            )}
          </div>
          {currentProject && onClearProject && (
            <button className="project-context-btn" onClick={onClearProject}>Clear</button>
          )}
          {onOpenProject && (
            <button className="project-context-btn" onClick={onOpenProject}>
              {currentProject ? "Switch" : "Open"}
            </button>
          )}
        </div>

        {/* Right: view mode toggle */}
        <div className="header-view-toggle">
          <button
            className="header-view-btn"
            data-active={String(viewMode === "focus")}
            onClick={() => viewMode !== "focus" && onToggleViewMode()}
          >
            Focus
          </button>
          <button
            className="header-view-btn"
            data-active={String(viewMode === "grid")}
            onClick={() => viewMode !== "grid" && onToggleViewMode()}
          >
            Grid
          </button>
        </div>

      </div>
    </header>
  );
}
