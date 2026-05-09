import { useState } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { HealthSnapshot, HealthStatus } from "../domain/health";

const HEALTH_DOT_COLOR: Record<string, string> = {
  ready:   "var(--success)",
  warning: "var(--warning)",
  error:   "var(--danger)",
  idle:    "var(--text-faint)",
};

function healthAggregateDot(snapshot: HealthSnapshot): ReactNode {
  if (snapshot.status === "idle")     return null;
  if (snapshot.status === "scanning") {
    return <span className="sidebar-health-dot" style={{ background: "var(--text-faint)", opacity: 0.5 }} />;
  }
  const ps = Object.values(snapshot.providers);
  const hasIssue = ps.some((p): boolean => {
    const s: HealthStatus = p.status;
    return s === "missing" || s === "auth_required" || s === "offline";
  });
  const hasError = ps.some((p) => p.status === "error");
  const allReady = ps.every((p) => p.status === "ready");
  const color = hasError
    ? HEALTH_DOT_COLOR.error
    : hasIssue
    ? HEALTH_DOT_COLOR.warning
    : allReady
    ? HEALTH_DOT_COLOR.ready
    : HEALTH_DOT_COLOR.idle;
  return <span className="sidebar-health-dot" style={{ background: color }} />;
}

interface AppSidebarProps {
  onAddTerminal:             () => void;
  onLoadDemo:                () => void;
  onOpenWorkflow:            () => void;
  onOpenHealth:              () => void;
  onNew:                     () => void;
  onSave:                    () => void;
  onLoad:                    (name: string) => void;
  onRefreshList:             () => void;
  savedWorkspaces:           string[];
  onOpenSettings:            () => void;
  onOpenHistory:             () => void;
  onStartAll:                () => void;
  onGenerateMemoryBriefs:    () => void;
  onExportTranscripts:       () => void;
  onGenerateBuildUpdateKit:  () => void;
  canGenerateBuildKit:       boolean;
  onOpenOutputLibrary:       () => void;
  outputFileCount:           number;
  onDeleteWorkspace:         (name: string) => void;
  terminalCount:             number;
  maxTerminals:              number;
  maxReached:                boolean;
  healthSnapshot:            HealthSnapshot;
}

type SidebarIconName =
  | "demo"
  | "workflow"
  | "health"
  | "start"
  | "new"
  | "save"
  | "load"
  | "settings"
  | "history"
  | "memory"
  | "transcript"
  | "share"
  | "library";

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
      {name === "memory" && (
        <>
          <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9l-6-6z" {...common} />
          <path d="M9 3v6h6" {...common} />
          <path d="M8 13h8" {...common} />
          <path d="M8 17h5" {...common} />
        </>
      )}
      {name === "transcript" && (
        <>
          <rect x="4" y="2" width="16" height="20" rx="2" {...common} />
          <path d="M8 7h8" {...common} />
          <path d="M8 11h8" {...common} />
          <path d="M8 15h5" {...common} />
          <circle cx="19" cy="19" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M19 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="19" cy="21" r="0.5" fill="currentColor" />
        </>
      )}
      {name === "share" && (
        <>
          <path d="M4.93 19.07a9 9 0 1 1 14.14 0" {...common} />
          <path d="M8.46 15.54a5 5 0 1 1 7.07 0" {...common} />
          <circle cx="12" cy="13" r="1.5" fill="currentColor" stroke="none" />
        </>
      )}
      {name === "health" && (
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...common} />
      )}
      {name === "library" && (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" {...common} />
          <rect x="14" y="3" width="7" height="7" rx="1" {...common} />
          <rect x="3" y="14" width="7" height="7" rx="1" {...common} />
          <path d="M14 17.5h7" {...common} />
          <path d="M17.5 14v7" {...common} />
        </>
      )}
    </svg>
  );
}

function SidebarRow({
  icon, children, trailing, ...buttonProps
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon:      SidebarIconName;
  trailing?: React.ReactNode;
}) {
  return (
    <button className="sidebar-row" {...buttonProps}>
      <SidebarIcon name={icon} />
      <span className="sidebar-row-text">{children}</span>
      {trailing}
    </button>
  );
}

export function AppSidebar({
  onAddTerminal,
  onLoadDemo,
  onOpenWorkflow,
  onOpenHealth,
  onNew,
  onSave,
  onLoad,
  onRefreshList,
  savedWorkspaces,
  onOpenSettings,
  onOpenHistory,
  onStartAll,
  onGenerateMemoryBriefs,
  onExportTranscripts,
  onGenerateBuildUpdateKit,
  canGenerateBuildKit,
  onOpenOutputLibrary,
  outputFileCount,
  onDeleteWorkspace,
  terminalCount,
  maxTerminals,
  maxReached,
  healthSnapshot,
}: AppSidebarProps) {
  const [selectedWorkspace, setSelectedWorkspace] = useState("");

  return (
    <aside className="app-sidebar">
      {/* Brand mark — subtle product identity, not a splash banner */}
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">&gt;_</span>
        <span className="sidebar-brand-title">CMDino</span>
        <span className="sidebar-brand-subtitle">alpha</span>
      </div>

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
            icon="health"
            onClick={onOpenHealth}
            title="View provider health and CLI status"
            trailing={healthAggregateDot(healthSnapshot)}
          >
            Health
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

          <SidebarRow
            icon="library"
            onClick={onOpenOutputLibrary}
            title={outputFileCount > 0 ? `Browse ${outputFileCount} generated file${outputFileCount !== 1 ? "s" : ""}` : "Browse generated output files"}
          >
            Output Library
            {outputFileCount > 0 && (
              <span style={{
                marginLeft: "auto",
                fontSize: 9, fontWeight: 700,
                color: "var(--text-faint)",
                background: "var(--surface-2, rgba(255,255,255,0.06))",
                border: "1px solid var(--border-subtle)",
                borderRadius: 999, padding: "1px 5px",
              }}>
                {outputFileCount}
              </span>
            )}
          </SidebarRow>

          <div className="sidebar-select-wrapper" title="Load a saved workspace">
            <SidebarIcon name="load" />
            <span className="sidebar-select-label">Load Workspace</span>
            <span className="sidebar-select-arrow">v</span>
            <select
              className="sidebar-select-native"
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              onFocus={onRefreshList}
            >
              <option value="" disabled>
                {savedWorkspaces.length === 0 ? "No saved workspaces yet." : "Select workspace…"}
              </option>
              {savedWorkspaces.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", gap: 4, padding: "2px 8px 4px" }}>
            <button
              className="cmd-pill-btn"
              style={{ flex: 1, fontSize: 10, padding: "4px 6px" }}
              disabled={!selectedWorkspace}
              title={selectedWorkspace ? `Load "${selectedWorkspace}"` : "Select a workspace first"}
              onClick={() => { if (selectedWorkspace) onLoad(selectedWorkspace); }}
            >
              Load
            </button>
            <button
              className="cmd-pill-btn cmd-pill-btn--danger"
              style={{ fontSize: 10, padding: "4px 8px" }}
              disabled={!selectedWorkspace}
              title={selectedWorkspace ? `Delete "${selectedWorkspace}"` : "Select a workspace first"}
              onClick={() => { if (selectedWorkspace) { onDeleteWorkspace(selectedWorkspace); setSelectedWorkspace(""); } }}
            >
              Delete
            </button>
          </div>

        </div>

        <div className="sidebar-section sidebar-section--secondary">
          <div className="sidebar-label">Session</div>
          <SidebarRow icon="history" onClick={onOpenHistory} title="View session event history">
            History
          </SidebarRow>
          <SidebarRow
            icon="memory"
            onClick={onGenerateMemoryBriefs}
            disabled={terminalCount === 0}
            title={terminalCount === 0 ? "No agents to generate briefs for" : "Generate markdown continuity files for current agents"}
          >
            Memory Briefs
          </SidebarRow>
          <SidebarRow
            icon="transcript"
            onClick={onExportTranscripts}
            disabled={terminalCount === 0}
            title={terminalCount === 0 ? "No agents to export transcripts for" : "Export buffered terminal output to markdown files"}
          >
            Transcripts
          </SidebarRow>
        </div>

        <div className="sidebar-section sidebar-section--secondary sidebar-section--divider">
          <div className="sidebar-label">Share</div>
          <SidebarRow
            icon="share"
            onClick={onGenerateBuildUpdateKit}
            disabled={!canGenerateBuildKit}
            title={canGenerateBuildKit ? "Generate build-in-public markdown kit in outputs folder" : "Deploy an agent or run a session first"}
          >
            Build Kit
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
