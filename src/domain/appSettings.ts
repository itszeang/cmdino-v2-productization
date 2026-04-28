export interface AppSettings {
  animationSpeed:      number;  // 0.6 – 1.6, default 1
  dinoScale:           number;  // 0.75 – 1.25, default 1
  terminalFontScale:   number;  // 0.85 – 1.25, default 1
  onboardingDismissed: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  animationSpeed:      1,
  dinoScale:           1,
  terminalFontScale:   1,
  onboardingDismissed: false,
};

const SETTINGS_KEY = "cmdino.v1.settings";

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const p = JSON.parse(raw) as Partial<AppSettings>;
    return {
      animationSpeed:
        typeof p.animationSpeed === "number"
          ? clamp(p.animationSpeed, 0.6, 1.6)
          : DEFAULT_SETTINGS.animationSpeed,
      dinoScale:
        typeof p.dinoScale === "number"
          ? clamp(p.dinoScale, 0.75, 1.25)
          : DEFAULT_SETTINGS.dinoScale,
      terminalFontScale:
        typeof p.terminalFontScale === "number"
          ? clamp(p.terminalFontScale, 0.85, 1.25)
          : DEFAULT_SETTINGS.terminalFontScale,
      onboardingDismissed:
        typeof p.onboardingDismissed === "boolean"
          ? p.onboardingDismissed
          : DEFAULT_SETTINGS.onboardingDismissed,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: AppSettings): void {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* silently ignore */ }
}
