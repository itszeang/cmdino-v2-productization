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
        <span style={{ color: "#334455", fontSize: 10, fontWeight: 700, letterSpacing: 1.2 }}>
          {label}
        </span>
        <span style={{ color: "#00c8ff", fontSize: 10, fontFamily: "monospace", minWidth: 36, textAlign: "right" }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#00c8ff", cursor: "pointer", height: 2 }}
      />
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#1a2a3a", fontSize: 8 }}>{min.toFixed(2)}</span>
        <span style={{ color: "#1a2a3a", fontSize: 8 }}>{max.toFixed(2)}</span>
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
        background:     "rgba(0,0,0,0.72)",
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
          background:    "#0b0f14",
          border:        "1px solid #0e2233",
          borderRadius:  8,
          display:       "flex",
          flexDirection: "column",
          overflow:      "hidden",
          boxShadow:     "0 0 60px rgba(0,200,255,0.06)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display:      "flex",
          alignItems:   "center",
          gap:          8,
          padding:      "10px 16px",
          borderBottom: "1px solid #0e2233",
          background:   "#0d1520",
        }}>
          <span style={{ color: "#00c8ff", fontWeight: 700, fontSize: 11, letterSpacing: 2, flex: 1 }}>
            SETTINGS
          </span>
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none", color: "#2a3a4a",
              fontSize: 14, cursor: "pointer", padding: "0 2px", lineHeight: 1,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#2a3a4a"; }}
          >✕</button>
        </div>

        {/* Visual settings */}
        <div style={{ borderBottom: "1px solid #0a1a24" }}>
          <div style={{ padding: "8px 16px 2px" }}>
            <span style={{ color: "#1a3040", fontSize: 9, letterSpacing: 1.5 }}>VISUAL</span>
          </div>
          <SliderRow
            label="ANIMATION SPEED"
            value={settings.animationSpeed}
            min={0.6} max={1.6} step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => onUpdate({ animationSpeed: v })}
          />
          <SliderRow
            label="DINO SCALE"
            value={settings.dinoScale}
            min={0.75} max={1.25} step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => onUpdate({ dinoScale: v })}
          />
          <SliderRow
            label="TERMINAL FONT SCALE"
            value={settings.terminalFontScale}
            min={0.85} max={1.25} step={0.05}
            format={(v) => `${v.toFixed(2)}×`}
            onChange={(v) => onUpdate({ terminalFontScale: v })}
          />
        </div>

        {/* Footer */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "10px 16px",
        }}>
          <span style={{ color: "#1a3040", fontSize: 9 }}>
            Saved to localStorage automatically
          </span>
          <button
            onClick={() => {
              if (window.confirm("Reset all visual settings to defaults?")) onReset();
            }}
            style={{
              background:   "none",
              border:       "1px solid #1a3a4a",
              color:        "#334455",
              fontSize:     9,
              padding:      "3px 8px",
              borderRadius: 3,
              fontFamily:   "inherit",
              fontWeight:   700,
              letterSpacing: 0.8,
              cursor:       "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#f8717155"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#334455"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a3a4a"; }}
          >
            RESET DEFAULTS
          </button>
        </div>

        {/* Onboarding reset */}
        <div style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          padding:        "6px 16px 10px",
        }}>
          <span style={{ color: "#0e1e2a", fontSize: 8, letterSpacing: 0.5 }}>
            CMDino V1 Alpha
            {settings.animationSpeed === DEFAULT_SETTINGS.animationSpeed
             && settings.dinoScale === DEFAULT_SETTINGS.dinoScale
             && settings.terminalFontScale === DEFAULT_SETTINGS.terminalFontScale
              ? "" : " · Modified"}
          </span>
          <button
            onClick={onShowOnboarding}
            title="Show mission briefing on next launch"
            style={{
              background:   "none",
              border:       "1px solid #0e2233",
              color:        "#1a3a4a",
              fontSize:     8,
              padding:      "2px 7px",
              borderRadius: 2,
              fontFamily:   "inherit",
              fontWeight:   700,
              letterSpacing: 0.6,
              cursor:       "pointer",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4a7a9a"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#1a3a4a"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#1a3a4a"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#0e2233"; }}
          >
            SHOW BRIEFING
          </button>
        </div>
      </div>
    </div>
  );
}
