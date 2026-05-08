export type RuntimeErrorKind =
  | "command_not_found"
  | "auth_required"
  | "service_unavailable"
  | "process_exited"
  | "spawn_failed"
  | "permission_denied"
  | "cwd_invalid"
  | "timeout"
  | "unknown_runtime_error";

export type RuntimeErrorSource = "spawn" | "exit" | "output" | "restart";

export type RuntimeErrorConfidence = "high" | "medium" | "low";

export interface RuntimeErrorInfo {
  kind:        RuntimeErrorKind;
  source:      RuntimeErrorSource;
  confidence:  RuntimeErrorConfidence;
  title:       string;
  message:     string;
  nextAction:  string;
  rawSummary?: string;
  exitCode?:   number | null;
  providerId?: "claude" | "codex" | "gemini" | "ollama" | "custom";
  occurredAt:  number;
}
