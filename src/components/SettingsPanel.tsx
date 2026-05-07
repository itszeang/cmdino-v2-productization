import type { AppSettings } from "../domain/appSettings";
import { DEFAULT_SETTINGS } from "../domain/appSettings";
import type { HealthSnapshot, HealthStatus } from "../domain/health";

const HEALTH_STATUS_LABEL: Record<HealthStatus, string> = {
  ready: "Ready", missing: "Missing", auth_required: "Auth needed",
  offline: "Offline", error: "Error", unknown: "Not verified", installed: "Installed",
};

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
    <div style={{ display: "flex", flexDirection: "column", gap: 5, padding: "10px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 650, letterSpacing: 0 }}>
          {label}
        </span>
        <span style={{ color: "var(--text-main)", fontSize: 11, fontFamily: "monospace", minWidth: 36, textAlign: "right" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer", height: 2 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "var(--text-faint)", fontSize: 8 }}>{min.toFixed(2)}</span>
        <span style={{ color: "var(--text-faint)", fontSize: 8 }}>{max.toFixed(2)}</span>
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
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
      <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 650, letterSpacing: 0 }}>
        THEME
      </span>
      <div style={{
        display: "flex",
        padding: 2,
        background: "var(--surface-0)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 999,
      }}>
        {(["dark", "light"] as const).map((mode) => {
          const active = value === mode;
          return (
            <button
              key={mode}
              onClick={() => onChange(mode)}
              style={{
                minWidth: 54,
                padding: "4px 8px",
                background: active ? "var(--accent-soft)" : "transparent",
                border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                borderRadius: 999,
                color: active ? "var(--text-main)" : "var(--text-muted)",
                cursor: "pointer",
                fontFamily: "inherit",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: 0.8,
              }}
            >
              {mode.toUpperCase()}
            </button>
          );
        })}
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
        <div style={{ borderBottom: "1px solid var(--border-subtle)", padding: "10px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 650 }}>System Health</span>
              <span style={{ color: healthColor, fontSize: 10, marginLeft: 8 }}>{healthLabel}</span>
            </div>
            <button className="cmd-pill-btn" style={{ fontSize: 10 }} onClick={onOpenHealth}>
              Open
            </button>
          </div>
        </div>

        <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ padding: "12px 16px 2px" }}>
            <span style={{ color: "var(--text-faint)", fontSize: 11, letterSpacing: 0 }}>Visual</span>
          </div>
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px" }}>
          <span style={{ color: "var(--text-faint)", fontSize: 9 }}>
            Saved to localStorage automatically
          </span>
          <button
            className="cmd-pill-btn cmd-pill-btn--danger"
            style={{ borderColor: "transparent" }}
            onClick={() => {
              if (window.confirm("Reset all visual settings to defaults?")) onReset();
            }}
          >
            RESET DEFAULTS
          </button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 16px 10px" }}>
          <span style={{ color: "var(--text-faint)", fontSize: 8, letterSpacing: 0.5 }}>
            CMDino V1 Alpha
            {settings.animationSpeed === DEFAULT_SETTINGS.animationSpeed
             && settings.dinoScale === DEFAULT_SETTINGS.dinoScale
             && settings.terminalFontScale === DEFAULT_SETTINGS.terminalFontScale
             && settings.themeMode === DEFAULT_SETTINGS.themeMode
              ? "" : " - Modified"}
          </span>
          <button
            className="cmd-pill-btn"
            style={{ borderColor: "transparent" }}
            onClick={onShowOnboarding}
            title="Show mission briefing on next launch"
          >
            SHOW BRIEFING
          </button>
        </div>
      </div>
    </div>
  );
}
