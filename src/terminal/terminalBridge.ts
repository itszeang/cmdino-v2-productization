import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

// Tauri v2: Rust snake_case params → camelCase in JS invoke.
// Event payloads: plain serde_json (snake_case as-is).

export interface TerminalDataEvent {
  agent_id: string;
  data: string;
}

export interface TerminalExitEvent {
  agent_id: string;
  code: number | null;
  reason: "exited" | "killed" | "error";
}

export const terminalBridge = {
  spawn(agentId: string, cwd: string, cols: number, rows: number): Promise<"spawned" | "already_running"> {
    return invoke<string>("spawn_terminal", { agentId, shell: "cmd.exe", cwd, cols, rows })
      .then((r) => r === "already_running" ? "already_running" : "spawned");
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
