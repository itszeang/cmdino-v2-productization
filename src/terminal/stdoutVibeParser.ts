import type { DinoState } from "./dinoStateMachine";
import { classifyStdoutChunk, createBurstTracker } from "./terminalIntelligence";

/** @deprecated Use classifyStdoutChunk from terminalIntelligence directly. */
export function parseStdoutVibe(raw: string): DinoState | null {
  const state = classifyStdoutChunk(raw, createBurstTracker());
  return state === "patrol_running" ? null : state;
}
