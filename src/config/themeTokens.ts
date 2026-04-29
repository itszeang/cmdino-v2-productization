import type { ITheme } from "@xterm/xterm";
import type { ThemeMode } from "../domain/appSettings";

export const XTERM_THEME_DARK: ITheme = {
  background:          "#0f0f0f",
  foreground:          "#e5e5e5",
  cursor:              "#f5f5f5",
  cursorAccent:        "#0f0f0f",
  selectionBackground: "#ffffff26",
  black:               "#171717",
  red:                 "#fca5a5",
  green:               "#86efac",
  yellow:              "#fbbf24",
  blue:                "#93c5fd",
  magenta:             "#c4b5fd",
  cyan:                "#a3a3a3",
  white:               "#e5e5e5",
  brightBlack:         "#525252",
  brightRed:           "#fecaca",
  brightGreen:         "#bbf7d0",
  brightYellow:        "#fde68a",
  brightBlue:          "#bfdbfe",
  brightMagenta:       "#ddd6fe",
  brightCyan:          "#d4d4d4",
  brightWhite:         "#fafafa",
};

export const XTERM_THEME_LIGHT: ITheme = {
  background:          "#111111",
  foreground:          "#e5e5e5",
  cursor:              "#f5f5f5",
  cursorAccent:        "#111111",
  selectionBackground: "#ffffff24",
  black:               "#171717",
  red:                 "#fca5a5",
  green:               "#86efac",
  yellow:              "#fbbf24",
  blue:                "#93c5fd",
  magenta:             "#c4b5fd",
  cyan:                "#a3a3a3",
  white:               "#e5e5e5",
  brightBlack:         "#525252",
  brightRed:           "#fecaca",
  brightGreen:         "#bbf7d0",
  brightYellow:        "#fde68a",
  brightBlue:          "#bfdbfe",
  brightMagenta:       "#ddd6fe",
  brightCyan:          "#d4d4d4",
  brightWhite:         "#fafafa",
};

export function getXtermTheme(mode: ThemeMode): ITheme {
  return mode === "light" ? XTERM_THEME_LIGHT : XTERM_THEME_DARK;
}
