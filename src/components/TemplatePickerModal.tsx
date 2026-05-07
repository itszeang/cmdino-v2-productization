import { useState } from "react";
import { WORKSPACE_TEMPLATES } from "../config/workspaceTemplates";
import { AGENT_PRESETS } from "../config/agentPresets";
import type { CmdinoWorkspaceFile } from "../domain/workspace";
import type { AgentKind } from "../domain/agentKind";

interface Props {
  onSelect: (workspace: CmdinoWorkspaceFile) => void;
  onClose:  () => void;
}

// Build accentColor lookup once at module level — pure data, no side-effects.
const ACCENT_BY_KIND: Record<string, string> = Object.fromEntries(
  AGENT_PRESETS.map((p) => [p.agentKind, p.accentColor])
);

function KindPill({ kind }: { kind: AgentKind }) {
  const color = ACCENT_BY_KIND[kind] ?? "#737373";
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: 0.3,
      padding: "2px 7px", borderRadius: 999,
      border: `1px solid ${color}`, color,
      flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {kind}
    </span>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: typeof WORKSPACE_TEMPLATES[number];
  onSelect: (workspace: CmdinoWorkspaceFile) => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onSelect(template.workspace)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display:          "flex",
        alignItems:       "center",
        gap:              16,
        padding:          "15px 20px",
        borderBottom:     "1px solid var(--border-subtle)",
        borderLeft:       `2px solid ${hovered ? "var(--border-strong)" : "transparent"}`,
        background:       hovered ? "var(--surface-2)" : "transparent",
        cursor:           "pointer",
        transition:       "background 0.1s, border-left-color 0.1s",
        userSelect:       "none",
      }}
    >
      {/* Left: name + tagline */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          color:      "var(--text-main)",
          fontWeight: 650,
          fontSize:   13,
          lineHeight: 1.3,
        }}>
          {template.name}
        </div>
        <div style={{
          color:     "var(--text-muted)",
          fontSize:  11,
          marginTop: 4,
          lineHeight: 1.4,
        }}>
          {template.tagline}
        </div>
        {/* Agent kind pills */}
        <div style={{
          display:   "flex",
          gap:       4,
          marginTop: 9,
          flexWrap:  "wrap",
          alignItems: "center",
        }}>
          {template.agentKinds.map((kind, i) => (
            <KindPill key={i} kind={kind} />
          ))}
          <span style={{
            fontSize: 10, color: "var(--text-faint)", marginLeft: 4,
          }}>
            {template.agentKinds.length} agents
          </span>
        </div>
      </div>

      {/* Right: chevron */}
      <svg
        viewBox="0 0 8 12"
        width="8"
        height="12"
        fill="none"
        stroke={hovered ? "var(--text-muted)" : "var(--text-faint)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, transition: "stroke 0.1s" }}
      >
        <path d="M1.5 1.5 6.5 6 1.5 10.5" />
      </svg>
    </div>
  );
}

export function TemplatePickerModal({ onSelect, onClose }: Props) {
  function handleSelect(workspace: CmdinoWorkspaceFile) {
    onSelect(workspace);
    // onSelect in App.tsx calls onClose via setShowTemplatePicker(false),
    // but call it here too for safety.
    onClose();
  }

  return (
    <div
      className="cmd-modal-overlay"
      style={{ zIndex: 500 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="cmd-modal-panel cmd-modal-panel--wide soft-enter">

        {/* Header */}
        <div className="cmd-modal-header">
          <div className="cmd-modal-title-group">
            <span className="cmd-modal-title">Workspace Templates</span>
            <span className="cmd-modal-subtitle">
              Load a pre-built multi-agent workflow. Set working directories after loading.
            </span>
          </div>
          <button className="cmd-icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Template list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {WORKSPACE_TEMPLATES.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={handleSelect}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="cmd-modal-footer" style={{ justifyContent: "center" }}>
          <button className="cmd-pill-btn cmd-pill-btn--ghost" style={{ fontSize: 12, padding: "7px 14px" }}
            onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
