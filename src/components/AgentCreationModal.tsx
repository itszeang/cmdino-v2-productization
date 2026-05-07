import { useState } from "react";
import { AGENT_PRESETS, type AgentPresetId } from "../config/agentPresets";
import { DINO_OPTIONS } from "../config/dinoOptions";
import { PRESET_BRAINS, getBrainById, buildBrainAttachments } from "../config/presetBrains";
import type { AgentKind } from "../domain/agentKind";
import type { TerminalAttachment } from "../domain/orchestration";
import type { HealthSnapshot, HealthProviderId, HealthStatus } from "../domain/health";

const PRESET_PROVIDER: Record<AgentPresetId, HealthProviderId> = {
  "claude-planner":   "claude",
  "codex-builder":    "codex",
  "gemini-reviewer":  "gemini",
  "ollama-worker":    "ollama",
  "custom-agent":     "custom",
};

const HEALTH_BADGE_COLOR: Record<HealthStatus, string | null> = {
  ready:         "var(--success)",
  missing:       "var(--danger)",
  auth_required: "var(--warning)",
  offline:       "var(--warning)",
  error:         "var(--danger)",
  unknown:       null,
  installed:     "var(--text-muted)",
};

const HEALTH_BADGE_LABEL: Record<HealthStatus, string> = {
  ready:         "Ready",
  missing:       "Missing",
  auth_required: "Auth needed",
  offline:       "Offline",
  error:         "Error",
  unknown:       "",
  installed:     "Installed",
};

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
  onConfirm:       (form: ConfirmPayload) => void;
  onCancel:        () => void;
  providerHealth?: HealthSnapshot;
}

const DEFAULT_CWD = "C:\\Users\\burak";

export function AgentCreationModal({ onConfirm, onCancel, providerHealth }: Props) {
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

  // Health-aware deploy gate
  const selectedProviderStatus: HealthStatus | undefined =
    form.presetId !== null && providerHealth?.status === "ready"
      ? providerHealth.providers[PRESET_PROVIDER[form.presetId]]?.status
      : undefined;
  const deployBlocked = selectedProviderStatus === "missing";

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
            {AGENT_PRESETS.map((p) => {
              const ph = providerHealth?.providers[PRESET_PROVIDER[p.id]];
              const badgeColor = ph ? HEALTH_BADGE_COLOR[ph.status] : null;
              const badgeLabel = ph ? HEALTH_BADGE_LABEL[ph.status] : "";
              return (
                <button
                  key={p.id}
                  className={`preset-card${form.presetId === p.id ? " preset-card--active" : ""}`}
                  style={{ "--preset-accent": p.accentColor } as React.CSSProperties}
                  onClick={() => applyPreset(p.id)}
                >
                  <span className="preset-card-title">{p.title}</span>
                  <span className="preset-card-role">{p.roleDescription}</span>
                  <span style={{ fontSize: 9, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>{p.cliRequirement}</span>
                  {badgeColor && badgeLabel && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, color: badgeColor,
                      marginTop: 2, letterSpacing: 0.2, lineHeight: 1,
                      background: `${badgeColor}20`, padding: "1px 5px", borderRadius: 3,
                      alignSelf: "flex-start",
                    }}>
                      {badgeLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Provider health notice for selected preset */}
        {selectedProviderStatus && selectedProviderStatus !== "ready" && (() => {
          const ph = providerHealth!.providers[PRESET_PROVIDER[form.presetId!]];

          type StripConfig = {
            bg: string; border: string; titleColor: string;
            title: string; footer: string; showHint: boolean;
          };

          const STRIP: Record<HealthStatus, StripConfig | null> = {
            ready: null,
            missing: {
              bg: "rgba(252,165,165,0.1)", border: "rgba(252,165,165,0.4)",
              titleColor: "var(--danger)",
              title: "CLI not installed — deploy disabled",
              footer: "Install the CLI and re-open this modal to deploy.",
              showHint: true,
            },
            auth_required: {
              bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.32)",
              titleColor: "var(--warning)",
              title: "Authentication needed",
              footer: "Deploy is allowed. The terminal may prompt for login when started.",
              showHint: true,
            },
            offline: {
              bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.32)",
              titleColor: "var(--warning)",
              title: "Service not running",
              footer: "Deploy is allowed. Start the service before running this agent.",
              showHint: true,
            },
            error: {
              bg: "var(--surface-2)", border: "var(--border-subtle)",
              titleColor: "var(--text-muted)",
              title: "Health check failed",
              footer: "Deploy is allowed. Open System Health for details.",
              showHint: false,
            },
            unknown: {
              bg: "var(--surface-2)", border: "var(--border-subtle)",
              titleColor: "var(--text-muted)",
              title: "Authentication not verified",
              footer: "Deploy is allowed. Watch for login prompts after starting.",
              showHint: false,
            },
            installed: {
              bg: "var(--surface-2)", border: "var(--border-subtle)",
              titleColor: "var(--text-muted)",
              title: "Installed — auth not verified",
              footer: "Deploy is allowed. Authentication will be checked when the agent starts.",
              showHint: true,
            },
          };

          const cfg = STRIP[ph.status];
          if (!cfg) return null;

          return (
            <div style={{
              margin: "0 18px 4px", padding: "11px 13px",
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: 8, display: "flex", flexDirection: "column", gap: 5, flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: cfg.titleColor, lineHeight: 1.2 }}>
                {cfg.title}
              </span>
              <span style={{ fontSize: 12, color: "var(--text-main)", lineHeight: 1.5 }}>
                {ph.explanation}
              </span>
              {cfg.showHint && ph.fixHint && (
                <span style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.4 }}>
                  {ph.fixHint}
                </span>
              )}
              <span style={{
                fontSize: 10, color: "var(--text-faint)", lineHeight: 1.4,
                borderTop: `1px solid ${cfg.border}`, paddingTop: 5, marginTop: 1,
              }}>
                {cfg.footer}
              </span>
            </div>
          );
        })()}

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
            disabled={!form.label.trim() || deployBlocked}
            title={deployBlocked ? "Install the required CLI before deploying this preset" : undefined}
          >
            Deploy Agent
          </button>
        </div>
      </div>
    </div>
  );
}
