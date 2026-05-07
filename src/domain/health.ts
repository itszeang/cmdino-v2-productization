export type HealthProviderId = "claude" | "codex" | "gemini" | "ollama" | "custom";
export type HealthStatus     = "ready" | "missing" | "auth_required" | "offline" | "error" | "unknown" | "installed";
export type HealthConfidence = "high" | "medium" | "low";

export interface ProviderHealth {
  id:          HealthProviderId;
  name:        string;
  command:     string | null;
  version?:    string;
  status:      HealthStatus;
  confidence:  HealthConfidence;
  explanation: string;
  fixHint:     string;
  checkedAt:   number;
  durationMs?: number;
  details: {
    authChecked?:    boolean;
    serviceChecked?: boolean;
    rawExitCode?:    number;
    timedOut?:       boolean;
  };
}

export interface HealthSnapshot {
  status:       "idle" | "scanning" | "ready" | "error";
  providers:    Record<HealthProviderId, ProviderHealth>;
  startedAt?:   number;
  completedAt?: number;
  error?:       string;
}
