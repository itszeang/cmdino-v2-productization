import { useState } from "react";

type TerminalViewMode = "focus" | "grid";

interface Props {
  workspaceName:   string;
  onNameChange:    (name: string) => void;
  onNew:           () => void;
  onSave:          () => void;
  onLoad:          (name: string) => void;
  onRefreshList:   () => void;
  savedWorkspaces: string[];
  onStartAll:      () => void;
  onLoadDemo:      () => void;
  onOpenWorkflow:  () => void;
  onOpenSettings:  () => void;
  onAddTerminal:   () => void;
  terminalCount:   number;
  maxTerminals:    number;
  maxReached:      boolean;
  viewMode:        TerminalViewMode;
  onToggleViewMode: () => void;
}

function TbBtn({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background:    "transparent",
        border:        "1px solid transparent",
        color:         "var(--text-muted)",
        fontSize:      12,
        padding:       "6px 10px",
        borderRadius:  999,
        fontFamily:    "inherit",
        fontWeight:    600,
        letterSpacing: 0,
        cursor:        "pointer",
        flexShrink:    0,
        transition:    "background 0.12s, color 0.12s",
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "var(--button-bg)";
        b.style.color      = "var(--text-main)";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "transparent";
        b.style.color      = "var(--text-muted)";
      }}
    >
      {children}
    </button>
  );
}

function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: TerminalViewMode;
  onToggle: () => void;
}) {
  const segBase: React.CSSProperties = {
    padding:       "5px 9px",
    fontSize:      11,
    fontFamily:    "inherit",
    fontWeight:    600,
    cursor:        "pointer",
    border:        "none",
    transition:    "background 0.12s, color 0.12s",
    letterSpacing: 0,
    lineHeight:    1,
  };

  return (
    <div
      style={{
        display:      "flex",
        border:       "1px solid var(--border-subtle)",
        borderRadius: 999,
        overflow:     "hidden",
        flexShrink:   0,
      }}
      title="Toggle Focus / Grid layout"
    >
      <button
        onClick={() => viewMode !== "focus" && onToggle()}
        style={{
          ...segBase,
          background: viewMode === "focus" ? "var(--accent)" : "transparent",
          color:      viewMode === "focus" ? "var(--app-bg)" : "var(--text-muted)",
          paddingLeft: 10,
        }}
      >
        FOCUS
      </button>
      <button
        onClick={() => viewMode !== "grid" && onToggle()}
        style={{
          ...segBase,
          background:  viewMode === "grid" ? "var(--accent)" : "transparent",
          color:       viewMode === "grid" ? "var(--app-bg)" : "var(--text-muted)",
          paddingRight: 10,
        }}
      >
        GRID
      </button>
    </div>
  );
}

export function WorkspaceToolbar({
  workspaceName,
  onNameChange,
  onNew,
  onSave,
  onLoad,
  onRefreshList,
  savedWorkspaces,
  onStartAll,
  onLoadDemo,
  onOpenWorkflow,
  onOpenSettings,
  onAddTerminal,
  terminalCount,
  maxTerminals,
  maxReached,
  viewMode,
  onToggleViewMode,
}: Props) {
  const [editing,   setEditing]   = useState(false);
  const [nameInput, setNameInput] = useState(workspaceName);

  function commitName() {
    setEditing(false);
    const trimmed = nameInput.trim() || "Untitled Workspace";
    setNameInput(trimmed);
    onNameChange(trimmed);
  }

  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        padding:      "8px 14px",
        height:       52,
        background:   "var(--app-bg)",
        borderBottom: "1px solid var(--border-subtle)",
        flexShrink:   0,
        gap:          8,
      }}
    >
      {/* Workspace name */}
      {editing ? (
        <input
          autoFocus
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === "Enter")  commitName();
            if (e.key === "Escape") { setEditing(false); setNameInput(workspaceName); }
          }}
          style={{
            background:   "var(--input-bg)",
            border:       "1px solid var(--border-subtle)",
            color:        "var(--text-main)",
            fontSize:     12,
            padding:      "6px 10px",
            borderRadius: 999,
            fontFamily:   "inherit",
            minWidth:     120,
            maxWidth:     200,
            outline:      "none",
            flexShrink:   0,
          }}
        />
      ) : (
        <span
          onClick={() => { setNameInput(workspaceName); setEditing(true); }}
          title="Click to rename workspace"
          style={{
            color:        "var(--text-main)",
            fontSize:     13,
            fontWeight:   650,
            cursor:       "text",
            letterSpacing: 0,
            flexShrink:   0,
            maxWidth:     180,
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {workspaceName}
        </span>
      )}

      <span style={{ color: "var(--border-subtle)", fontSize: 16, flexShrink: 0, userSelect: "none" }}>|</span>

      {/* + Terminal — primary CTA */}
      <button
        onClick={onAddTerminal}
        disabled={maxReached}
        style={{
          display:      "flex",
          alignItems:   "center",
          gap:          5,
          padding:      "6px 13px",
          background:   maxReached ? "transparent" : "var(--accent)",
          border:       "1px solid transparent",
          borderRadius: 999,
          color:        maxReached ? "var(--text-faint)" : "var(--app-bg)",
          fontSize:     12,
          fontFamily:   "inherit",
          fontWeight:   650,
          letterSpacing: 0,
          cursor:       maxReached ? "not-allowed" : "pointer",
          flexShrink:   0,
          transition:   "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!maxReached) (e.currentTarget as HTMLButtonElement).style.opacity = "0.88";
        }}
        onMouseLeave={(e) => {
          if (!maxReached) (e.currentTarget as HTMLButtonElement).style.opacity = "1";
        }}
      >
        + TERMINAL
      </button>

      {/* Focus / Grid toggle */}
      <ViewToggle viewMode={viewMode} onToggle={onToggleViewMode} />

      {/* Quiet count */}
      <span
        style={{
          color:        "var(--text-faint)",
          fontSize:     11,
          letterSpacing: 0,
          flexShrink:   0,
          userSelect:   "none",
        }}
      >
        {terminalCount}/{maxTerminals}
      </span>

      {/* Start All — only when terminals exist */}
      {terminalCount > 0 && (
        <TbBtn onClick={onStartAll} title="Start all dormant terminals">START ALL</TbBtn>
      )}

      <TbBtn onClick={onOpenWorkflow} title="Open workflow view">WORKFLOW</TbBtn>
      <TbBtn onClick={onOpenSettings} title="Visual settings">SETTINGS</TbBtn>

      <span style={{ color: "var(--border-subtle)", fontSize: 16, flexShrink: 0, userSelect: "none" }}>|</span>

      <TbBtn onClick={onNew}      title="Clear workspace and start fresh">NEW</TbBtn>
      <TbBtn onClick={onSave}     title="Save workspace to disk">SAVE</TbBtn>

      {/* Load dropdown */}
      <select
        value=""
        onChange={(e) => { if (e.target.value) { onLoad(e.target.value); } }}
        onFocus={onRefreshList}
        style={{
          background:   "var(--button-bg)",
          border:       "1px solid transparent",
          color:        savedWorkspaces.length > 0 ? "var(--text-muted)" : "var(--text-faint)",
          fontSize:     12,
          padding:      "6px 10px",
          borderRadius: 999,
          fontFamily:   "inherit",
          cursor:       "pointer",
          flexShrink:   0,
          maxWidth:     110,
        }}
      >
        <option value="">LOAD ▾</option>
        {savedWorkspaces.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <TbBtn onClick={onLoadDemo} title="Load the CMDino demo setup">DEMO</TbBtn>
    </div>
  );
}
