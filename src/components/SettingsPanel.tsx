import type { AppSettings } from "../domain/appSettings";
import { DEFAULT_SETTINGS } from "../domain/appSettings";
import type { HealthSnapshot } from "../domain/health";
import { HEALTH_STATUS_LABELS } from "../domain/health";

const HEALTH_STATUS_LABEL = HEALTH_STATUS_LABELS;

function settingsHealthSummary(snapshot: HealthSnapshot): { label: string; color: string } {
  if (snapshot.status === "idle")     return { label: "Not scanned",  color: "var(--text-faint)" };
  if (snapshot.status === "scanning") return { label: "Scanning…",    color: "var(--text-faint)" };
  if (snapshot.status === "error")    return { label: "Scan error",   color: "var(--danger)" };
  const ps = Object.values(snapshot.providers);
  const issues = ps.filter((p) => p.status === "missing" || p.status === "auth_required" || p.status === "offline" || p.status === "error");
  if (issues.length === 0) return { label: "All clear",    color: "var(--success)" };
  const labels = issues.map((p) => HEALTH_STATUS_LABEL[p.status]);
  return { label: `${issues.length} issue${issues.length > 1 ? "s" : ""} — ${[...new Set(labels)].join(", ")}`, color: "var(--warning)" };
}

interface SliderRowProps {
  label:    string;
  value:    number;
  min:      number;
  max:      number;
  step:     number;
  format?:  (v: number) => string;
  onChange: (v: number) => void;
}

function SliderRow({ label, value, min, max, step, format, onChange }: SliderRowProps) {
  const display = format ? format(value) : value.toFixed(2);
  return (
    <div className="settings-slider-row">
      <div className="settings-slider-head">
        <span className="settings-slider-label">{label}</span>
        <span className="settings-slider-val">{display}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", height: 2 }}
      />
      <div className="settings-slider-range">
        <span>{min.toFixed(2)}</span>
        <span>{max.toFixed(2)}</span>
      </div>
    </div>
  );
}

function ThemeToggle({
  value,
  onChange,
}: {
  value: AppSettings["themeMode"];
  onChange: (value: AppSettings["themeMode"]) => void;
}) {
  return (
    <div className="settings-row">
      <span className="settings-row-label">THEME</span>
      <div className="settings-theme-toggle">
        {(["dark", "light"] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={`settings-theme-btn${value === mode ? " settings-theme-btn--active" : ""}`}
          >
            {mode.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  settings:          AppSettings;
  onUpdate:          (patch: Partial<AppSettings>) => void;
  onReset:           () => void;
  onClose:           () => void;
  onShowOnboarding:  () => void;
  healthSnapshot:    HealthSnapshot;
  onOpenHealth:      () => void;
}

export function SettingsPanel({ settings, onUpdate, onReset, onClose, onShowOnboarding, healthSnapshot, onOpenHealth }: Props) {
  const { label: healthLabel, color: healthColor } = settingsHealthSummary(healthSnapshot);
  return (
    <div
      className="cmd-modal-overlay"
      style={{ zIndex: 300 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="cmd-modal-panel cmd-modal-panel--compact soft-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cmd-modal-header">
          <span style={{ color: "var(--text-main)", fontWeight: 650, fontSize: 13, flex: 1 }}>
            Settings
          </span>
          <button className="cmd-icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* System Health */}
        <div className="settings-section">
          <div className="settings-row">
            <div>
              <span className="settings-row-label">System Health</span>
              <span style={{ color: healthColor, fontSize: 10, marginLeft: 8 }}>{healthLabel}</span>
            </div>
            <button className="cmdino-action-btn cmdino-action-btn--ghost" style={{ fontSize: 10, padding: "4px 10px" }} onClick={onOpenHealth}>
              Open
            </button>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">Visual</div>
          <ThemeToggle
            value={settings.themeMode}
            onChange={(themeMode) => onUpdate({ themeMode })}
          />
          <SliderRow
            label="ANIMATION SPEED"
            value={settings.animationSpeed}
            min={0.6} max={1.6} step={0.05}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => onUpdate({ animationSpeed: v })}
          />
          <SliderRow
            label="DINO SCALE"
            value={settings.dinoScale}
            min={0.75} max={1.25} step={0.05}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => onUpdate({ dinoScale: v })}
          />
          <SliderRow
            label="TERMINAL FONT SCALE"
            value={settings.terminalFontScale}
            min={0.85} max={1.25} step={0.05}
            format={(v) => `${v.toFixed(2)}x`}
            onChange={(v) => onUpdate({ terminalFontScale: v })}
          />
        </div>

        <div className="settings-footer-row">
          <span className="settings-footer-hint">Saved locally on this machine</span>
          <button
            className="cmdino-action-btn cmdino-action-btn--danger"
            style={{ fontSize: 10, padding: "4px 10px" }}
            onClick={() => {
              if (window.confirm("Reset all visual settings to defaults?")) onReset();
            }}
          >
            RESET DEFAULTS
          </button>
        </div>

        <div className="settings-footer-row" style={{ paddingTop: 4 }}>
          <span className="settings-footer-hint" style={{ fontSize: 8 }}>
            CMDino Alpha - Local-first desktop build
            {settings.animationSpeed === DEFAULT_SETTINGS.animationSpeed
             && settings.dinoScale === DEFAULT_SETTINGS.dinoScale
             && settings.terminalFontScale === DEFAULT_SETTINGS.terminalFontScale
             && settings.themeMode === DEFAULT_SETTINGS.themeMode
              ? "" : " - custom visual settings"}
          </span>
          <button
            className="cmdino-action-btn cmdino-action-btn--ghost"
            style={{ fontSize: 10, padding: "4px 10px" }}
            onClick={onShowOnboarding}
            title="Show onboarding on next launch"
          >
            SHOW ONBOARDING
          </button>
        </div>
      </div>
    </div>
  );
}
