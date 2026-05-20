export type SessionLogEventType =
  | "agent_created"
  | "agent_updated"
  | "terminal_start"
  | "terminal_restart"
  | "terminal_kill"
  | "terminal_exited"
  | "terminal_error"
  | "runtime_error"
  | "terminal_output"
  | "terminal_removed"
  | "manual_send"
  | "preset_brain_send"
  | "manual_handoff"
  | "auto_forward"
  | "attachment_added"
  | "attachment_removed"
  | "workspace_saved"
  | "workspace_loaded"
  | "interaction_response_sent";

export interface SessionLogEvent {
  id:              string;
  ts:              number;
  workspaceId:     string;
  agentConfigId:   string;
  agentRuntimeId?: string;
  agentLabel:      string;
  type:            SessionLogEventType;
  payload:         Record<string, unknown>;
}

/** Max bytes per terminal_output block before truncation */
export const OUTPUT_BLOCK_CAP = 12 * 1024;
/** Max bytes for send / handoff captured text */
export const SEND_TEXT_CAP    = 32 * 1024;
/** Max events read into the drawer at once */
export const DRAWER_EVENT_CAP = 2000;
/** Debounce interval for flushing output blocks (ms) */
export const OUTPUT_FLUSH_MS  = 750;
