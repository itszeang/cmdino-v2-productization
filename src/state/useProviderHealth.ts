import { useCallback, useRef, useState } from "react";
import { runHealthScan } from "../health/healthBridge";
import type { HealthProviderId, HealthSnapshot, ProviderHealth } from "../domain/health";

const PROVIDER_IDS: HealthProviderId[] = ["claude", "codex", "gemini", "ollama", "custom"];

const PROVIDER_NAMES: Record<HealthProviderId, string> = {
  claude: "Claude CLI",
  codex:  "Codex CLI",
  gemini: "Gemini CLI",
  ollama: "Ollama",
  custom: "Custom Commands",
};

const PROVIDER_COMMANDS: Record<HealthProviderId, string | null> = {
  claude: "claude",
  codex:  "codex",
  gemini: "gemini",
  ollama: "ollama",
  custom: null,
};

function emptySnapshot(): HealthSnapshot {
  const providers = {} as Record<HealthProviderId, ProviderHealth>;
  for (const id of PROVIDER_IDS) {
    providers[id] = {
      id,
      name:        PROVIDER_NAMES[id],
      command:     PROVIDER_COMMANDS[id],
      status:      "unknown",
      confidence:  "low",
      explanation: "Not yet scanned.",
      fixHint:     "",
      checkedAt:   0,
      details:     {},
    };
  }
  return { status: "idle", providers };
}

export function useProviderHealth() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot>(emptySnapshot);

  // lockedRef: hard lock — only one Tauri invoke at a time.
  // Prevents concurrent child process spawning on Windows which
  // produced intermittent bad results ("every other refresh" pattern).
  const lockedRef = useRef(false);

  // genRef: belt-and-suspenders against stale in-flight results.
  const genRef = useRef(0);

  const refresh = useCallback(async () => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    const gen = ++genRef.current;
    const startedAt = Date.now();

    // SCANNING: preserve existing provider list so the panel never goes blank.
    setSnapshot((prev) => ({ ...prev, status: "scanning", startedAt }));

    try {
      const results = await runHealthScan();

      if (gen !== genRef.current) return;

      // SUCCESS: build a FRESH provider map from scan results.
      // Do NOT merge with prev.providers — stale statuses from the previous
      // scan must not survive into the new ready state.
      const freshProviders = {} as Record<HealthProviderId, ProviderHealth>;
      for (const p of results) {
        freshProviders[p.id] = p;
      }
      // Guarantee all 5 IDs present even if backend returned fewer.
      for (const id of PROVIDER_IDS) {
        if (!freshProviders[id]) {
          freshProviders[id] = {
            id,
            name:        PROVIDER_NAMES[id],
            command:     PROVIDER_COMMANDS[id],
            status:      "unknown",
            confidence:  "low",
            explanation: "Provider was not returned by the scan.",
            fixHint:     "",
            checkedAt:   startedAt,
            details:     {},
          };
        }
      }

      setSnapshot({
        status:      "ready",
        providers:   freshProviders,
        startedAt,
        completedAt: Date.now(),
      });
    } catch (err) {
      if (gen !== genRef.current) return;
      // ERROR: keep last known providers visible, just surface the error status.
      setSnapshot((prev) => ({
        ...prev,
        status:      "error",
        error:       String(err),
        completedAt: Date.now(),
      }));
    } finally {
      lockedRef.current = false;
    }
  }, []);

  return { snapshot, refresh };
}
