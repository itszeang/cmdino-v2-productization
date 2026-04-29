export type DinoState =
  | "idle_center"
  | "patrol_running"
  | "heavy_processing"
  | "review_scan"
  | "warning_avoid"
  | "success_signal"
  | "handoff_signal"
  | "terminal_error"
  | "terminal_dead"
  | "spawn_crack"
  | "spawn_hatch"
  | "spawn_move"
  | "disconnected_idle"
  | "disconnected_move";

export type SimTrigger = "running" | "thinking" | "success" | "error" | "dead";

export function triggerToState(trigger: SimTrigger): DinoState {
  switch (trigger) {
    case "running":  return "patrol_running";
    case "thinking": return "heavy_processing";
    case "success":  return "success_signal";
    case "error":    return "terminal_error";
    case "dead":     return "terminal_dead";
  }
}

export function isPatrolState(s: DinoState): boolean {
  return s === "patrol_running" || s === "heavy_processing" || s === "disconnected_move";
}

export function isCenteringState(s: DinoState): boolean {
  return s === "idle_center" || s === "success_signal" || s === "handoff_signal";
}

export function isStaticState(s: DinoState): boolean {
  return s === "terminal_error" || s === "terminal_dead" || s === "review_scan";
}

export function isEggState(s: DinoState): boolean {
  return s === "spawn_crack" || s === "spawn_hatch" || s === "spawn_move";
}
