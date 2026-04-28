import { useCallback, useState } from "react";
import type { AppSettings } from "../domain/appSettings";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../domain/appSettings";

export function useAppSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...DEFAULT_SETTINGS };
    saveSettings(defaults);
    setSettingsState(defaults);
  }, []);

  return { settings, updateSettings, resetSettings };
}
