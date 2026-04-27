import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Tauri v2 serializes Rust snake_case params as camelCase on the JS side.
// Event payloads are plain serde_json — agent_id stays snake_case.

export interface TerminalDataEvent {
  agent_id: string;
  data: string;
}

export interface TerminalExitEvent {
  agent_id: string;
  code: number;
}

export const terminalBridge = {
  spawn(agentId: string, cwd: string, cols: number, rows: number): Promise<void> {
    return invoke("spawn_terminal", {
      agentId,
      shell: "cmd.exe",
      cwd,
      cols,
      rows,
    });
  },

  write(agentId: string, data: string): Promise<void> {
    return invoke("write_terminal", { agentId, data });
  },

  resize(agentId: string, cols: number, rows: number): Promise<void> {
    return invoke("resize_terminal", { agentId, cols, rows });
  },

  kill(agentId: string): Promise<void> {
    return invoke("kill_terminal", { agentId });
  },

  onData(cb: (e: TerminalDataEvent) => void): Promise<UnlistenFn> {
    return listen<TerminalDataEvent>("terminal:data", (e) => cb(e.payload));
  },

  onExit(cb: (e: TerminalExitEvent) => void): Promise<UnlistenFn> {
    return listen<TerminalExitEvent>("terminal:exit", (e) => cb(e.payload));
  },
};
