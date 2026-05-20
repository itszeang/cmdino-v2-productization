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
    <span
      className="template-kind-pill"
      style={{ border: `1px solid ${color}`, color }}
    >
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
  return (
    <div
      className="template-card"
      onClick={() => onSelect(template.workspace)}
    >
      <div className="template-card-copy">
        <div className="template-card-name">{template.name}</div>
        <div className="template-card-tagline">{template.tagline}</div>
        <div className="template-card-pills">
          {template.agentKinds.map((kind, i) => (
            <KindPill key={i} kind={kind} />
          ))}
          <span className="template-card-count">{template.agentKinds.length} agents</span>
        </div>
      </div>
      <svg
        viewBox="0 0 8 12"
        width="8"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="template-card-chevron"
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
        <div className="template-list-body">
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
          <button className="cmdino-action-btn cmdino-action-btn--ghost" onClick={onClose}>
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
}
