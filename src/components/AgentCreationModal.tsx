import { useState } from "react";
import { AGENT_PRESETS, type AgentPresetId } from "../config/agentPresets";
import { DINO_OPTIONS } from "../config/dinoOptions";
import { PRESET_BRAINS, getBrainById, buildBrainAttachments } from "../config/presetBrains";
import type { AgentKind } from "../domain/agentKind";
import type { TerminalAttachment } from "../domain/orchestration";

interface FormState {
  presetId:         AgentPresetId | null;
  label:            string;
  command:          string;
  cwd:              string;
  dinoId:           string;
  agentKind:        AgentKind;
  roleDescription:  string;
  selectedBrainIds: Set<string>;
}

interface ConfirmPayload {
  label:              string;
  command:            string;
  cwd:                string;
  dinoId:             string;
  agentKind:          AgentKind;
  initialAttachments: TerminalAttachment[];
}

interface Props {
  onConfirm: (form: ConfirmPayload) => void;
  onCancel:  () => void;
}

const DEFAULT_CWD = "C:\\Users\\burak";

export function AgentCreationModal({ onConfirm, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({
    presetId:         null,
    label:            "",
    command:          "",
    cwd:              DEFAULT_CWD,
    dinoId:           DINO_OPTIONS[0].id,
    agentKind:        "custom",
    roleDescription:  "",
    selectedBrainIds: new Set<string>(),
  });

  function applyPreset(presetId: AgentPresetId) {
    const preset = AGENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      presetId,
      label:            preset.defaultLabel,
      command:          preset.defaultCommand,
      agentKind:        preset.agentKind,
      dinoId:           preset.defaultDinoId ?? DINO_OPTIONS[0].id,
      roleDescription:  preset.roleDescription,
      selectedBrainIds: new Set<string>(preset.defaultBrainIds ?? []),
    }));
  }

  function toggleBrain(brainId: string, checked: boolean) {
    setForm((f) => {
      const next = new Set(f.selectedBrainIds);
      if (checked) next.add(brainId);
      else next.delete(brainId);
      return { ...f, selectedBrainIds: next };
    });
  }

  function handleSubmit() {
    if (!form.label.trim()) return;
    const initialAttachments = buildBrainAttachments(
      Array.from(form.selectedBrainIds),
    );
    onConfirm({
      label:     form.label.trim(),
      command:   form.command.trim(),
      cwd:       form.cwd.trim() || DEFAULT_CWD,
      dinoId:    form.dinoId,
      agentKind: form.agentKind,
      initialAttachments,
    });
  }

  // Brains visible for current preset
  const presetBrainIds = form.presetId
    ? (AGENT_PRESETS.find((p) => p.id === form.presetId)?.defaultBrainIds ?? [])
    : [];
  const visibleBrains = presetBrainIds
    .map((id) => getBrainById(id))
    .filter(Boolean) as typeof PRESET_BRAINS;
  const showBrainSection = visibleBrains.length > 0 && form.presetId !== "custom-agent";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box modal-box--agent" onClick={(e) => e.stopPropagation()}>

        <div className="modal-header">
          <span className="modal-title">Deploy Agent</span>
          <button className="modal-close-btn" onClick={onCancel}>×</button>
        </div>

        {/* CLI requirement note */}
        <div style={{
          margin:       "0 0 2px 0",
          padding:      "8px 12px",
          background:   "var(--surface-0)",
          borderBottom: "1px solid var(--border-subtle)",
          fontSize:     11,
          color:        "var(--text-faint)",
          lineHeight:   1.5,
          flexShrink:   0,
        }}>
          CMDino runs CLI tools installed on your machine. Preset agents require their CLIs to be installed and authenticated. Custom Agent can run any local shell command or CLI-based tool.
        </div>

        {/* Preset cards */}
        <div className="modal-field-group">
          <label className="modal-label">Preset</label>
          <div className="preset-card-grid">
            {AGENT_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-card${form.presetId === p.id ? " preset-card--active" : ""}`}
                style={{ "--preset-accent": p.accentColor } as React.CSSProperties}
                onClick={() => applyPreset(p.id)}
              >
                <span className="preset-card-title">{p.title}</span>
                <span className="preset-card-role">{p.roleDescription}</span>
                <span style={{ fontSize: 9, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{p.cliRequirement}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Preset brain section — only for presets with brains */}
        {showBrainSection && (
          <div className="modal-field-group">
            <label className="modal-label">Preset Brain</label>
            {visibleBrains.map((brain) => (
              <label key={brain.id} className="brain-row">
                <input
                  type="checkbox"
                  checked={form.selectedBrainIds.has(brain.id)}
                  onChange={(e) => toggleBrain(brain.id, e.target.checked)}
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <div className="brain-row-text">
                  <span className="brain-filename">{brain.fileName}</span>
                  <span className="brain-desc">{brain.description}</span>
                </div>
              </label>
            ))}
            <span className="modal-hint">Attached on deploy · sent only when you press SEND</span>
          </div>
        )}

        {/* Label */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-label">Label</label>
          <input
            id="modal-label"
            className="modal-input"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Agent label"
            autoFocus
          />
        </div>

        {/* Agent Kind */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-kind">Agent Kind</label>
          <select
            id="modal-kind"
            className="modal-input modal-select"
            value={form.agentKind}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                agentKind: e.target.value as AgentKind,
                presetId:  null,
              }))
            }
          >
            <option value="claude">Claude</option>
            <option value="codex">Codex</option>
            <option value="gemini">Gemini</option>
            <option value="ollama">Ollama</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {/* Launch command */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-cmd">Launch Command</label>
          <input
            id="modal-cmd"
            className="modal-input modal-input--mono"
            value={form.command}
            onChange={(e) => setForm((f) => ({ ...f, command: e.target.value }))}
            placeholder="e.g. claude  (leave blank for plain shell)"
          />
        </div>

        {/* Working directory */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-cwd">Working Directory</label>
          <input
            id="modal-cwd"
            className="modal-input modal-input--mono"
            value={form.cwd}
            onChange={(e) => setForm((f) => ({ ...f, cwd: e.target.value }))}
            placeholder={DEFAULT_CWD}
          />
        </div>

        {/* Dino selector */}
        <div className="modal-field-group">
          <label className="modal-label">Dino</label>
          <div className="dino-row">
            {DINO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`dino-btn${form.dinoId === opt.id ? " dino-btn--active" : ""}`}
                onClick={() => setForm((f) => ({ ...f, dinoId: opt.id }))}
                title={opt.label}
              >
                <span
                  className="dino-sprite"
                  style={{ backgroundImage: `url("${opt.idlePath}")` }}
                />
                <span className="dino-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="modal-btn modal-btn--cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            className="modal-btn modal-btn--create"
            onClick={handleSubmit}
            disabled={!form.label.trim()}
          >
            Deploy Agent
          </button>
        </div>
      </div>
    </div>
  );
}
