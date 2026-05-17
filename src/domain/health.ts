export type HealthProviderId = "claude" | "codex" | "gemini" | "ollama" | "custom";
export type HealthStatus     = "ready" | "missing" | "auth_required" | "auth_check_inconclusive" | "offline" | "error" | "unknown" | "installed";
export type HealthConfidence = "high" | "medium" | "low";

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  ready:                   "Ready",
  missing:                 "Missing",
  auth_required:           "Auth needed",
  auth_check_inconclusive: "Auth unverifiable",
  offline:                 "Offline",
  error:                   "Check failed",
  unknown:                 "Not verified",
  installed:               "Installed",
};

export function healthStatusIsBlocker(status: HealthStatus): boolean {
  return status === "missing" || status === "auth_required" || status === "error";
}

export function healthStatusIsUsable(status: HealthStatus): boolean {
  return status === "ready" || status === "installed" || status === "auth_check_inconclusive";
}

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
