import type { ButtonHTMLAttributes } from "react";

interface AppSidebarProps {
  onAddTerminal:   () => void;
  onLoadDemo:      () => void;
  onOpenWorkflow:  () => void;
  onNew:           () => void;
  onSave:          () => void;
  onLoad:          (name: string) => void;
  onRefreshList:   () => void;
  savedWorkspaces: string[];
  onOpenSettings:  () => void;
  onOpenHistory:   () => void;
  onStartAll:      () => void;
  terminalCount:   number;
  maxTerminals:    number;
  maxReached:      boolean;
}

type SidebarIconName =
  | "demo"
  | "workflow"
  | "start"
  | "new"
  | "save"
  | "load"
  | "settings"
  | "history";

function SidebarIcon({ name }: { name: SidebarIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      className="sidebar-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {name === "demo" && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M10 8.5v7l5.5-3.5L10 8.5z" {...common} />
        </>
      )}
      {name === "workflow" && (
        <>
          <circle cx="6" cy="6" r="2.5" {...common} />
          <circle cx="18" cy="18" r="2.5" {...common} />
          <path d="M8.5 6h3.5a4 4 0 0 1 4 4v5.5" {...common} />
        </>
      )}
      {name === "start" && (
        <>
          <path d="M5 5v14l6-4V9L5 5z" {...common} />
          <path d="M13 5v14l6-4V9l-6-4z" {...common} />
        </>
      )}
      {name === "new" && (
        <>
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" {...common} />
          <path d="M14 3v5h5" {...common} />
          <path d="M12 12v5" {...common} />
          <path d="M9.5 14.5h5" {...common} />
        </>
      )}
      {name === "save" && (
        <>
          <path d="M5 4h12l2 2v14H5V4z" {...common} />
          <path d="M8 4v6h8V4" {...common} />
          <path d="M8 16h8" {...common} />
        </>
      )}
      {name === "load" && (
        <>
          <path d="M3.5 7.5h6l2 2h9v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-11z" {...common} />
          <path d="M12 13v4" {...common} />
          <path d="M9.8 14.8 12 17l2.2-2.2" {...common} />
        </>
      )}
      {name === "settings" && (
        <>
          <circle cx="12" cy="12" r="3" {...common} />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.1 2.1-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-3v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-2.1-2.1.1-.1A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.6-1h-.2v-3h.2A1.7 1.7 0 0 0 7 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.1-2.1.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h3v.2a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 2.1 2.1-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v3H21a1.7 1.7 0 0 0-1.6 1z" {...common} />
        </>
      )}
      {name === "history" && (
        <>
          <circle cx="12" cy="12" r="9" {...common} />
          <path d="M12 7v5l3 3" {...common} />
        </>
      )}
    </svg>
  );
}

function SidebarRow({
  icon,
  children,
  ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: SidebarIconName;
}) {
  return (
    <button className="sidebar-row" {...buttonProps}>
      <SidebarIcon name={icon} />
      <span className="sidebar-row-text">{children}</span>
    </button>
  );
}

export function AppSidebar({
  onAddTerminal,
  onLoadDemo,
  onOpenWorkflow,
  onNew,
  onSave,
  onLoad,
  onRefreshList,
  savedWorkspaces,
  onOpenSettings,
  onOpenHistory,
  onStartAll,
  terminalCount,
  maxTerminals,
  maxReached,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-top">
        <button
          className="sidebar-cta"
          onClick={onAddTerminal}
          disabled={maxReached}
          title={maxReached ? `Maximum ${maxTerminals} agents reached` : "Deploy a new agent"}
        >
          + Agent
        </button>
      </div>

      <div className="sidebar-sections">
        <div className="sidebar-section">
          <div className="sidebar-label">Workspace</div>
          <SidebarRow icon="demo" onClick={onLoadDemo} title="Load CMDino Alpha Demo">
            Demo
          </SidebarRow>
          <SidebarRow icon="workflow" onClick={onOpenWorkflow} title="Open workflow canvas">
            Workflow
          </SidebarRow>
          <SidebarRow
            icon="start"
            onClick={onStartAll}
            disabled={terminalCount === 0}
            title={terminalCount === 0 ? "No terminals to start" : "Start all dormant terminals"}
          >
            Start All
          </SidebarRow>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Files</div>
          <SidebarRow icon="new" onClick={onNew} title="Clear workspace and start fresh">
            New Workspace
          </SidebarRow>
          <SidebarRow icon="save" onClick={onSave} title="Save current workspace to disk">
            Save
          </SidebarRow>

          <div className="sidebar-select-wrapper" title="Load a saved workspace">
            <SidebarIcon name="load" />
            <span className="sidebar-select-label">Load Workspace</span>
            <span className="sidebar-select-arrow">v</span>
            <select
              className="sidebar-select-native"
              value=""
              onChange={(e) => { if (e.target.value) onLoad(e.target.value); }}
              onFocus={onRefreshList}
            >
              <option value="" disabled></option>
              {savedWorkspaces.length === 0 ? (
                <option value="" disabled>No saved workspaces</option>
              ) : (
                savedWorkspaces.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))
              )}
            </select>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">Session</div>
          <SidebarRow icon="history" onClick={onOpenHistory} title="View session event history">
            History
          </SidebarRow>
        </div>
      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-count">
          <span>{terminalCount} / {maxTerminals}</span>
          <span>terminals</span>
        </div>
        <SidebarRow icon="settings" onClick={onOpenSettings} title="Visual and agent settings">
          Settings
        </SidebarRow>
      </div>
    </aside>
  );
}
