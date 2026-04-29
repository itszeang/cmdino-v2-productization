import { useState } from "react";
import type { TerminalViewMode } from "../domain/viewMode";

interface MainHeaderProps {
  workspaceName:       string;
  onNameChange:        (name: string) => void;
  viewMode:            TerminalViewMode;
  onToggleViewMode:    () => void;
  activeTerminalLabel?: string;
}

export function MainHeader({
  workspaceName,
  onNameChange,
  viewMode,
  onToggleViewMode,
  activeTerminalLabel,
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
      <div className="header-context">
        {editing ? (
          <input
            className="header-name-input"
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") {
                setEditing(false);
                setNameInput(workspaceName);
              }
            }}
          />
        ) : (
          <span
            className="header-name-display"
            onClick={() => {
              setNameInput(workspaceName);
              setEditing(true);
            }}
            title="Click to rename workspace"
          >
            {workspaceName}
          </span>
        )}

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

        {activeTerminalLabel && viewMode === "focus" && (
          <span className="header-active-label">
            {activeTerminalLabel}
          </span>
        )}
      </div>
    </header>
  );
}
