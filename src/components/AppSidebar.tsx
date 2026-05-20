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
  onOpenChat:                () => void;
  onOpenAgents:              () => void;
  onAddTerminal:             () => void;
  onLoadDemo:                () => void;
  onOpenWorkflow:            () => void;
  onOpenContextLibrary:      () => void;
  onOpenWorkflowHistory:     () => void;
  onOpenHealth:              () => void;
  onNew:                     () => void;
  onSave:                    () => void;
  onRefreshList:             () => void;
  onOpenWorkspaceBrowser:    () => void;
  savedWorkspaces:           string[];
  onOpenSettings:            () => void;
  onOpenHistory:             () => void;
  onStartAll:                () => void;
  onGenerateMemoryBriefs:    () => void;
  canGenerateMemoryBrief:    boolean;
  onExportTranscripts:       () => void;
  onGenerateBuildUpdateKit:  () => void;
  canGenerateBuildKit:       boolean;
  onOpenOutputLibrary:       () => void;
  outputFileCount:           number;
  terminalCount:             number;
  maxTerminals:              number;
  maxReached:                boolean;
  healthSnapshot:            HealthSnapshot;
  activeSurface?:            "chat" | "agents";
  openInterventionCount?:    number;
}

type SidebarIconName =
  | "chat"
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
      {name === "chat" && (
        <>
          <path d="M5 5h14v10H8l-3 3V5z" {...common} />
          <path d="M8 9h8" {...common} />
          <path d="M8 12h5" {...common} />
        </>
      )}
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
  onOpenChat,
  onOpenAgents,
  onAddTerminal,
  onLoadDemo,
  onOpenWorkflow,
  onOpenContextLibrary,
  onOpenWorkflowHistory,
  onOpenHealth,
  onNew,
  onSave,
  onRefreshList,
  onOpenWorkspaceBrowser,
  savedWorkspaces,
  onOpenSettings,
  onOpenHistory,
  onStartAll,
  onGenerateMemoryBriefs,
  canGenerateMemoryBrief,
  onExportTranscripts,
  onGenerateBuildUpdateKit,
  canGenerateBuildKit,
  onOpenOutputLibrary,
  outputFileCount,
  terminalCount,
  maxTerminals,
  maxReached,
  healthSnapshot,
  activeSurface,
  openInterventionCount = 0,
}: AppSidebarProps) {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-brand-mark">&gt;_</span>
        <span className="sidebar-brand-title">CMDino</span>
        <span className="sidebar-brand-subtitle">Alpha build</span>
      </div>

      <div className="sidebar-top">
        <button
          className="sidebar-cta"
          onClick={onAddTerminal}
          disabled={maxReached}
          title={maxReached ? `Maximum ${maxTerminals} agents reached` : "Add a new agent"}
        >
          Add Agent
        </button>
      </div>

      <div className="sidebar-sections">

        {/* ── Command ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">Command</div>
          <SidebarRow
            icon="chat"
            onClick={onOpenChat}
            title="Mission Control"
            data-active={String(activeSurface === "chat")}
            trailing={openInterventionCount > 0 ? (
              <span className="sidebar-alert-badge">{openInterventionCount}</span>
            ) : undefined}
          >
            Mission Control
          </SidebarRow>
        </div>

        {/* ── Agents ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">Agents</div>
          <SidebarRow
            icon="start"
            onClick={onOpenAgents}
            title="Open the agent terminal workspace"
            data-active={String(activeSurface === "agents")}
          >
            Agent Workspace
          </SidebarRow>
          <SidebarRow
            icon="start"
            onClick={onStartAll}
            disabled={terminalCount === 0}
            title={terminalCount === 0 ? "No agents to start" : "Start all dormant agents"}
          >
            Start Agents
          </SidebarRow>
          <SidebarRow
            icon="health"
            onClick={onOpenHealth}
            title="Check provider availability and CLI setup"
            trailing={healthAggregateDot(healthSnapshot)}
          >
            Setup Check
          </SidebarRow>
        </div>

        {/* ── Context ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">Context</div>
          <SidebarRow
            icon="library"
            onClick={onOpenContextLibrary}
            title="Open persistent project and agent context files"
          >
            Context Library
          </SidebarRow>
          <SidebarRow
            icon="library"
            onClick={onOpenOutputLibrary}
            title={outputFileCount > 0 ? `Browse ${outputFileCount} generated file${outputFileCount !== 1 ? "s" : ""}` : "Browse generated output files"}
            trailing={outputFileCount > 0 ? (
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
            ) : undefined}
          >
            Output Shelf
          </SidebarRow>
        </div>

        {/* ── Runs ── */}
        <div className="sidebar-section">
          <div className="sidebar-label">Runs</div>
          <SidebarRow
            icon="workflow"
            onClick={onOpenWorkflow}
            title="View your agent map and workflow connections"
          >
            Agent Map
          </SidebarRow>
          <SidebarRow
            icon="history"
            onClick={onOpenWorkflowHistory}
            title="Inspect and resume local workflow runs"
          >
            Workflow History
          </SidebarRow>
          <SidebarRow
            icon="history"
            onClick={onOpenHistory}
            title="View session activity log"
          >
            Activity Log
          </SidebarRow>
        </div>

        {/* ── Manage ── */}
        <div className="sidebar-section sidebar-section--secondary sidebar-section--divider">
          <div className="sidebar-label">Manage</div>
          <SidebarRow icon="new" onClick={onNew} title="Clear workspace and start fresh">
            New Workspace
          </SidebarRow>
          <SidebarRow icon="save" onClick={onSave} title="Save current workspace to disk">
            Save Workspace
          </SidebarRow>
          <SidebarRow
            icon="load"
            onClick={() => {
              onRefreshList();
              onOpenWorkspaceBrowser();
            }}
            title={savedWorkspaces.length === 0 ? "Browse saved workspaces" : `Browse ${savedWorkspaces.length} saved workspace${savedWorkspaces.length !== 1 ? "s" : ""}`}
            trailing={savedWorkspaces.length > 0 ? (
              <span className="sidebar-alert-badge">{savedWorkspaces.length}</span>
            ) : undefined}
          >
            Open Workspace
          </SidebarRow>
          <SidebarRow icon="demo" onClick={onLoadDemo} title="Load the CMDino demo workflow">
            Try Demo
          </SidebarRow>
          <SidebarRow
            icon="share"
            onClick={onGenerateBuildUpdateKit}
            disabled={!canGenerateBuildKit}
            title={canGenerateBuildKit ? "Generate shareable progress update" : "Run a session first"}
          >
            Share Progress
          </SidebarRow>
          <SidebarRow
            icon="memory"
            onClick={onGenerateMemoryBriefs}
            disabled={!canGenerateMemoryBrief}
            title={canGenerateMemoryBrief ? "Save project continuity brief" : "Run a workflow first"}
          >
            Memory Brief
          </SidebarRow>
          <SidebarRow
            icon="transcript"
            onClick={onExportTranscripts}
            disabled={terminalCount === 0}
            title={terminalCount === 0 ? "No agents to export" : "Export terminal output"}
          >
            Export Logs
          </SidebarRow>
          <SidebarRow icon="settings" onClick={onOpenSettings} title="Visual and agent settings">
            Settings
          </SidebarRow>
        </div>

      </div>

      <div className="sidebar-bottom">
        <div className="sidebar-count">
          <span>{terminalCount} / {maxTerminals}</span>
          <span>agents</span>
        </div>
      </div>
    </aside>
  );
}
