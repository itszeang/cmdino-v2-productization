import type { DinoState } from "./dinoStateMachine";

export type AgentActivity =
  | "waiting_for_user"
  | "streaming_response"
  | "running_tool"
  | "editing_files"
  | "asking_approval"
  | "command_running"
  | "completed"
  | "fatal_error"
  | "unknown_active";

export function activityToDinoState(activity: AgentActivity): DinoState {
  switch (activity) {
    case "waiting_for_user":   return "idle_center";
    case "streaming_response": return "heavy_processing";
    case "running_tool":       return "patrol_running";
    case "editing_files":      return "patrol_running";
    case "command_running":    return "patrol_running";
    case "asking_approval":    return "review_scan";
    case "completed":          return "success_signal";
    case "fatal_error":        return "terminal_error";
    case "unknown_active":     return "patrol_running";
  }
}

export interface AgentAdapterInput {
  chunk:                   string;
  recentOutput:            string;
  normalizedChunk:         string;
  normalizedRecentOutput:  string;
}
