import { useState } from "react";

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
        background:   "none",
        border:       "1px solid #1a3a4a",
        color:        "#4a7a9a",
        fontSize:     10,
        padding:      "2px 6px",
        borderRadius: 3,
        fontFamily:   "inherit",
        fontWeight:   700,
        letterSpacing: 1,
        cursor:       "pointer",
        flexShrink:   0,
        transition:   "color 0.12s, border-color 0.12s",
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color       = "#7dd3fc";
        b.style.borderColor = "#00c8ff44";
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color       = "#4a7a9a";
        b.style.borderColor = "#1a3a4a";
      }}
    >
      {children}
    </button>
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
}: Props) {
  const [editing,    setEditing]   = useState(false);
  const [nameInput,  setNameInput] = useState(workspaceName);

  function commitName() {
    setEditing(false);
    const trimmed = nameInput.trim() || "Untitled Workspace";
    setNameInput(trimmed);
    onNameChange(trimmed);
  }

  return (
    <div
      style={{
        display:       "flex",
        alignItems:    "center",
        padding:       "0 10px",
        height:        36,
        background:    "#060a0d",
        borderBottom:  "1px solid #0a1a24",
        flexShrink:    0,
        gap:           8,
      }}
    >
      {/* Brand */}
      <span
        style={{
          color:         "#00c8ff",
          fontWeight:    700,
          fontSize:      13,
          letterSpacing: 2,
          flexShrink:    0,
        }}
      >
        CMDino
      </span>

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
            background:    "#0d1520",
            border:        "1px solid #00c8ff44",
            color:         "#7dd3fc",
            fontSize:      11,
            padding:       "2px 6px",
            borderRadius:  3,
            fontFamily:    "inherit",
            minWidth:      120,
            maxWidth:      200,
            outline:       "none",
          }}
        />
      ) : (
        <span
          onClick={() => { setNameInput(workspaceName); setEditing(true); }}
          title="Click to rename workspace"
          style={{
            color:         "#4a7a9a",
            fontSize:      11,
            cursor:        "text",
            letterSpacing: 0.5,
            flexShrink:    0,
            maxWidth:      180,
            overflow:      "hidden",
            textOverflow:  "ellipsis",
            whiteSpace:    "nowrap",
          }}
        >
          {workspaceName}
        </span>
      )}

      <span style={{ color: "#0a2030", fontSize: 10, flexShrink: 0 }}>│</span>

      {/* Workspace action buttons */}
      <TbBtn onClick={onNew}  title="Clear workspace and start fresh">NEW</TbBtn>
      <TbBtn onClick={onSave} title="Save workspace to disk">SAVE</TbBtn>

      {/* Load dropdown */}
      <select
        value=""
        onChange={(e) => { if (e.target.value) { onLoad(e.target.value); } }}
        onFocus={onRefreshList}
        style={{
          background:    "#0d1520",
          border:        "1px solid #1a3a4a",
          color:         savedWorkspaces.length > 0 ? "#4a7a9a" : "#1e3a4a",
          fontSize:      10,
          padding:       "2px 4px",
          borderRadius:  3,
          fontFamily:    "inherit",
          cursor:        "pointer",
          flexShrink:    0,
          maxWidth:      110,
        }}
      >
        <option value="">LOAD ▾</option>
        {savedWorkspaces.map((name) => (
          <option key={name} value={name}>{name}</option>
        ))}
      </select>

      <TbBtn onClick={onLoadDemo} title="Load CMDino Alpha Demo workspace">DEMO</TbBtn>

      {/* Start All — only visible when terminals exist */}
      {terminalCount > 0 && (
        <TbBtn onClick={onStartAll} title="Start all dormant terminals">START ALL</TbBtn>
      )}
      <TbBtn onClick={onOpenWorkflow} title="Open workflow view">WORKFLOW</TbBtn>
      <TbBtn onClick={onOpenSettings} title="Visual settings">SETTINGS</TbBtn>

      {/* Spacer */}
      <span style={{ flex: 1 }} />

      {/* Count */}
      <span
        style={{
          color:         "#1a3a4a",
          fontSize:      10,
          letterSpacing: 1,
          flexShrink:    0,
        }}
      >
        {terminalCount}/{maxTerminals} ACTIVE
      </span>

      {/* + TERMINAL */}
      <button
        onClick={onAddTerminal}
        disabled={maxReached}
        style={{
          display:       "flex",
          alignItems:    "center",
          gap:           5,
          padding:       "4px 10px",
          background:    maxReached ? "transparent" : "#00c8ff0f",
          border:        `1px solid ${maxReached ? "#1a2a3a" : "#00c8ff44"}`,
          borderRadius:  4,
          color:         maxReached ? "#1a3a4a" : "#00c8ff",
          fontSize:      11,
          fontFamily:    "inherit",
          fontWeight:    700,
          letterSpacing: 1,
          cursor:        maxReached ? "not-allowed" : "pointer",
          flexShrink:    0,
          transition:    "all 0.15s",
        }}
        onMouseEnter={(e) => {
          if (!maxReached) (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff1a";
        }}
        onMouseLeave={(e) => {
          if (!maxReached) (e.currentTarget as HTMLButtonElement).style.background = "#00c8ff0f";
        }}
      >
        + TERMINAL
      </button>
    </div>
  );
}
