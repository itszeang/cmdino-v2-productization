import { invoke } from "@tauri-apps/api/core";
import type { HealthProviderId, HealthStatus, HealthConfidence, ProviderHealth } from "../domain/health";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

// ── DTO from Rust backend ─────────────────────────────────────────────────────

interface ProviderHealthDto {
  id:          string;
  status:      string;
  confidence:  string;
  version?:    string;
  explanation: string;
  fix_hint:    string;
  duration_ms: number;
  details: {
    auth_checked:    boolean;
    service_checked: boolean;
    raw_exit_code?:  number;
    timed_out:       boolean;
  };
}

// ── Static metadata ───────────────────────────────────────────────────────────

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

// ── Mapping ───────────────────────────────────────────────────────────────────

function dtoToProviderHealth(dto: ProviderHealthDto, checkedAt: number): ProviderHealth {
  const id = dto.id as HealthProviderId;
  return {
    id,
    name:        PROVIDER_NAMES[id] ?? dto.id,
    command:     PROVIDER_COMMANDS[id] ?? null,
    version:     dto.version,
    status:      dto.status as HealthStatus,
    confidence:  dto.confidence as HealthConfidence,
    explanation: dto.explanation,
    fixHint:     dto.fix_hint,
    checkedAt,
    durationMs:  dto.duration_ms,
    details: {
      authChecked:    dto.details.auth_checked,
      serviceChecked: dto.details.service_checked,
      rawExitCode:    dto.details.raw_exit_code,
      timedOut:       dto.details.timed_out,
    },
  };
}

function unknownProvider(id: HealthProviderId): ProviderHealth {
  return {
    id,
    name:        PROVIDER_NAMES[id],
    command:     PROVIDER_COMMANDS[id],
    status:      "unknown",
    confidence:  "low",
    explanation: "Desktop health checks require the CMDino app.",
    fixHint:     "",
    checkedAt:   Date.now(),
    details:     {},
  };
}

const ALL_IDS: HealthProviderId[] = ["claude", "codex", "gemini", "ollama", "custom"];

// ── Public API ────────────────────────────────────────────────────────────────

export async function runHealthScan(): Promise<ProviderHealth[]> {
  if (!isTauri) {
    return ALL_IDS.map(unknownProvider);
  }
  const now = Date.now();
  try {
    const dtos = await invoke<ProviderHealthDto[]>("run_health_scan");
    return dtos.map((dto) => dtoToProviderHealth(dto, now));
  } catch (err) {
    console.error("[healthBridge] run_health_scan failed:", err);
    return ALL_IDS.map((id) => ({
      ...unknownProvider(id),
      status:      "error" as HealthStatus,
      explanation: "Health scan failed. Try refreshing.",
      fixHint:     String(err),
    }));
  }
}
