import type { DinoState } from "../terminal/dinoStateMachine";

export type AnimCategory = "base" | "egg" | "ghost";

export interface AnimRef {
  category: AnimCategory;
  name: string;
}

export const DINO_STATE_MAP: Record<DinoState, AnimRef> = {
  idle_center:       { category: "base",  name: "idle"  },
  patrol_running:    { category: "base",  name: "move"  },
  heavy_processing:  { category: "base",  name: "dash"  },
  review_scan:       { category: "base",  name: "scan"  },
  warning_avoid:     { category: "base",  name: "avoid" },
  success_signal:    { category: "base",  name: "jump"  },
  handoff_signal:    { category: "base",  name: "kick"  },
  terminal_error:    { category: "base",  name: "hurt"  },
  terminal_dead:     { category: "base",  name: "dead"  },
  spawn_crack:       { category: "egg",   name: "crack" },
  spawn_hatch:       { category: "egg",   name: "hatch" },
  spawn_move:        { category: "egg",   name: "move"  },
  disconnected_idle: { category: "ghost", name: "idle"  },
  disconnected_move: { category: "ghost", name: "move"  },
};
