import type { AppSettings } from "../domain/appSettings";
import { DEFAULT_SETTINGS } from "../domain/appSettings";

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
}

export function SettingsPanel({ settings, onUpdate, onReset, onClose, onShowOnboarding }: Props) {
  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "var(--overlay-bg)",
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        zIndex:         300,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width:         360,
          maxWidth:      "94vw",
          background:    "var(--surface-1)",
          border:        "1px solid var(--border-subtle)",
          borderRadius:  12,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     "var(--shadow-panel)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          padding:      "10px 16px",
          borderBottom: "1px solid var(--border-subtle)",
          background:   "var(--surface-1)",
        }}>
          <span style={{ color: "var(--text-main)", fontWeight: 650, fontSize: 13, letterSpacing: 0, flex: 1 }}>
            Settings
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "var(--text-muted)",
              fontSize: 14, cursor: "pointer", padding: "3px 6px", lineHeight: 1, borderRadius: 999,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--danger)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-faint)"; }}
          >x</button>
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

        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "10px 16px",
        }}>
          <span style={{ color: "var(--text-faint)", fontSize: 9 }}>
            Saved to localStorage automatically
          </span>
          <button
            onClick={() => {
              if (window.confirm("Reset all visual settings to defaults?")) onReset();
            }}
            style={{
              background:   "none",
              border:       "1px solid transparent",
              color:        "var(--text-muted)",
              fontSize:     11,
              padding:      "6px 10px",
              borderRadius: 999,
              fontFamily:   "inherit",
              fontWeight:   600,
              letterSpacing: 0,
              cursor:       "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--danger)";
              e.currentTarget.style.background = "var(--button-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            RESET DEFAULTS
          </button>
        </div>

        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "6px 16px 10px",
        }}>
          <span style={{ color: "var(--text-faint)", fontSize: 8, letterSpacing: 0.5 }}>
            CMDino V1 Alpha
            {settings.animationSpeed === DEFAULT_SETTINGS.animationSpeed
             && settings.dinoScale === DEFAULT_SETTINGS.dinoScale
             && settings.terminalFontScale === DEFAULT_SETTINGS.terminalFontScale
             && settings.themeMode === DEFAULT_SETTINGS.themeMode
              ? "" : " - Modified"}
          </span>
          <button
            onClick={onShowOnboarding}
            title="Show mission briefing on next launch"
            style={{
              background:   "none",
              border:       "1px solid transparent",
              color:        "var(--text-muted)",
              fontSize:     11,
              padding:      "6px 10px",
              borderRadius: 999,
              fontFamily:   "inherit",
              fontWeight:   600,
              letterSpacing: 0,
              cursor:       "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--text-main)";
              e.currentTarget.style.background = "var(--button-bg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "none";
            }}
          >
            SHOW BRIEFING
          </button>
        </div>
      </div>
    </div>
  );
}
