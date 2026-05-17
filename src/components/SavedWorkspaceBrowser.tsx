interface Props {
  savedWorkspaces: string[];
  onRefresh: () => void;
  onOpen: (name: string) => void;
  onDelete: (name: string) => void;
  onClose: () => void;
}

export function SavedWorkspaceBrowser({
  savedWorkspaces,
  onRefresh,
  onOpen,
  onDelete,
  onClose,
}: Props) {
  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="workspace-browser-modal" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Saved Workspaces</div>
            <div className="workspace-browser-subtitle">Open or remove local workspace configs. Running terminals are handled by the existing load confirmation.</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>x</button>
        </div>
        <div className="workspace-browser-actions">
          <button className="cmd-pill-btn" onClick={onRefresh}>Refresh</button>
        </div>
        <div className="workspace-browser-list">
          {savedWorkspaces.length === 0 ? (
            <div className="workspace-browser-empty">No saved workspaces yet.</div>
          ) : (
            savedWorkspaces.map((name) => (
              <div className="workspace-browser-row" key={name}>
                <div className="workspace-browser-name">{name}</div>
                <button className="cmd-pill-btn" onClick={() => onOpen(name)}>Open</button>
                <button className="cmd-pill-btn cmd-pill-btn--danger" onClick={() => onDelete(name)}>Delete</button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
