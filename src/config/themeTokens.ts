import type { ITheme } from "@xterm/xterm";

export const XTERM_THEME_DARK: ITheme = {
  background:          "#070b0e",
  foreground:          "#c8d8e8",
  cursor:              "#00c8ff",
  cursorAccent:        "#070b0e",
  selectionBackground: "#00c8ff33",
  black:               "#0d1117",
  red:                 "#f87171",
  green:               "#4ade80",
  yellow:              "#facc15",
  blue:                "#60a5fa",
  magenta:             "#c084fc",
  cyan:                "#22d3ee",
  white:               "#e2e8f0",
  brightBlack:         "#374151",
  brightRed:           "#fca5a5",
  brightGreen:         "#86efac",
  brightYellow:        "#fde68a",
  brightBlue:          "#93c5fd",
  brightMagenta:       "#d8b4fe",
  brightCyan:          "#67e8f9",
  brightWhite:         "#f8fafc",
};

export const XTERM_THEME_LIGHT: ITheme = {
  background:          "#111827",
  foreground:          "#e2e8f0",
  cursor:              "#38bdf8",
  cursorAccent:        "#111827",
  selectionBackground: "#38bdf833",
  black:               "#1f2937",
  red:                 "#f87171",
  green:               "#4ade80",
  yellow:              "#facc15",
  blue:                "#60a5fa",
  magenta:             "#c084fc",
  cyan:                "#22d3ee",
  white:               "#e2e8f0",
  brightBlack:         "#374151",
  brightRed:           "#fca5a5",
  brightGreen:         "#86efac",
  brightYellow:        "#fde68a",
  brightBlue:          "#93c5fd",
  brightMagenta:       "#d8b4fe",
  brightCyan:          "#67e8f9",
  brightWhite:         "#f8fafc",
};

export function getXtermTheme(mode: "dark" | "light"): ITheme {
  return mode === "light" ? XTERM_THEME_LIGHT : XTERM_THEME_DARK;
}
