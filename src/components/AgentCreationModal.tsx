import { useState } from "react";
import { AGENT_PRESETS } from "../config/agentPresets";
import { DINO_OPTIONS } from "../config/dinoOptions";
import type { AgentKind } from "../domain/agentKind";

interface FormState {
  presetId: AgentKind;
  label: string;
  command: string;
  cwd: string;
  dinoId: string;
}

interface ConfirmPayload {
  label:     string;
  command:   string;
  cwd:       string;
  dinoId:    string;
  agentKind: AgentKind;
}

interface Props {
  onConfirm: (form: ConfirmPayload) => void;
  onCancel: () => void;
}

const DEFAULT_CWD = "C:\\Users\\burak";

export function AgentCreationModal({ onConfirm, onCancel }: Props) {
  const [form, setForm] = useState<FormState>({
    presetId: "claude",
    label: "Claude Builder",
    command: "claude",
    cwd: DEFAULT_CWD,
    dinoId: "female-cole",
  });

  function applyPreset(presetId: AgentKind) {
    const preset = AGENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      presetId,
      label: preset.defaultLabel,
      command: preset.defaultCommand,
    }));
  }

  function handleSubmit() {
    if (!form.label.trim()) return;
    onConfirm({
      label:     form.label.trim(),
      command:   form.command.trim(),
      cwd:       form.cwd.trim() || DEFAULT_CWD,
      dinoId:    form.dinoId,
      agentKind: form.presetId,
    });
  }

  const activePreset = AGENT_PRESETS.find((p) => p.id === form.presetId);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="modal-header">
          <span className="modal-title">NEW DINO TERMINAL</span>
          <button className="modal-close-btn" onClick={onCancel}>✕</button>
        </div>

        {/* Preset row */}
        <div className="modal-field-group">
          <label className="modal-label">PRESET</label>
          <div className="preset-row">
            {AGENT_PRESETS.map((p) => (
              <button
                key={p.id}
                className={`preset-btn${form.presetId === p.id ? " preset-btn--active" : ""}`}
                style={{
                  borderColor: form.presetId === p.id ? p.accentColor : undefined,
                  color: form.presetId === p.id ? p.accentColor : undefined,
                  background: form.presetId === p.id ? `${p.accentColor}12` : undefined,
                }}
                onClick={() => applyPreset(p.id)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Label */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-label">LABEL</label>
          <input
            id="modal-label"
            className="modal-input"
            value={form.label}
            onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
            placeholder="Terminal label"
            autoFocus
          />
        </div>

        {/* Launch command */}
        <div className="modal-field-group">
          <label className="modal-label" htmlFor="modal-cmd">LAUNCH COMMAND</label>
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
          <label className="modal-label" htmlFor="modal-cwd">WORKING DIRECTORY</label>
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
          <label className="modal-label">DINO</label>
          <div className="dino-row">
            {DINO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                className={`dino-btn${form.dinoId === opt.id ? " dino-btn--active" : ""}`}
                style={{
                  borderColor: form.dinoId === opt.id
                    ? (activePreset?.accentColor ?? "#00c8ff")
                    : undefined,
                }}
                onClick={() => setForm((f) => ({ ...f, dinoId: opt.id }))}
                title={opt.label}
              >
                {/* First frame of idle sprite via CSS background clip */}
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
            CANCEL
          </button>
          <button
            className="modal-btn modal-btn--create"
            style={{ borderColor: activePreset?.accentColor, color: activePreset?.accentColor }}
            onClick={handleSubmit}
            disabled={!form.label.trim()}
          >
            CREATE TERMINAL
          </button>
        </div>
      </div>
    </div>
  );
}
