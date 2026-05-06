import { invoke } from "@tauri-apps/api/core";
import type { TerminalAgent } from "../domain/terminalAgent";
import type { AgentKind } from "../domain/agentKind";
import type { ReadinessResult } from "../domain/readiness";

const isTauri = Boolean(
  (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
);

// Preset kinds that map to a known CLI for friendly error messages.
const PRESET_CLI: Partial<Record<AgentKind, string>> = {
  claude: "claude",
  codex:  "codex",
  gemini: "gemini",
  ollama: "ollama",
};

const CLI_ERROR: Record<string, string> = {
  claude: "Claude CLI not found. Install and authenticate Claude Code, or update this agent command.",
  codex:  "Codex CLI not found. Install and authenticate Codex CLI, or update this agent command.",
  gemini: "Gemini CLI not found. Install and authenticate Gemini CLI, or update this agent command.",
  ollama: "Ollama CLI not found. Install Ollama and pull a model, or update this agent command.",
};

// Shell builtins and package managers that must NOT be PATH-validated.
// Everything else (node, python, cargo, custom CLIs, etc.) IS validated.
const SKIP_EXECUTABLES = new Set([
  "echo", "cd", "dir", "set", "cls",
  "powershell", "cmd",
  "npm", "npx", "pnpm", "yarn",
]);

// Any shell operator makes the whole expression too complex to validate strictly.
const COMPLEX_PATTERN = /[&|><]/;

/**
 * Extract the bare executable name from a launch command.
 * Returns null when the command should not be strictly validated:
 *   - blank / empty
 *   - contains shell operators (&&, ||, |, >, <)
 *   - first token is a known shell builtin or package manager
 */
export function parseLaunchExecutable(launchCommand: string | undefined): string | null {
  const cmd = (launchCommand ?? "").trim();
  if (!cmd) return null;

  if (COMPLEX_PATTERN.test(cmd)) return null;

  const firstToken = cmd.split(/\s+/)[0];
  const baseName   = firstToken.split(/[/\\]/).pop() ?? firstToken;
  const baseNoExt  = baseName.replace(/\.(exe|cmd|bat|com)$/i, "");

  if (SKIP_EXECUTABLES.has(baseNoExt.toLowerCase())) return null;

  return baseNoExt;
}

async function checkDirectory(path: string): Promise<boolean> {
  try {
    return await invoke<boolean>("check_directory_exists", { path });
  } catch {
    return true;
  }
}

async function checkCommand(command: string): Promise<boolean> {
  try {
    return await invoke<boolean>("check_command_available", { command });
  } catch (err) {
    // Invoke failure in Tauri context = handler not registered (stale binary).
    // Fail closed: block the command rather than silently allowing unknown executables.
    console.error("[readiness] check_command_available failed – rebuild required:", err);
    return false;
  }
}

export async function validateAgentReadiness(agent: TerminalAgent): Promise<ReadinessResult> {
  // Non-Tauri context (web preview): skip all checks.
  if (!isTauri) return { ok: true };

  // ── CWD check (all agents) ────────────────────────────────────────────────
  if (agent.cwd) {
    const ok = await checkDirectory(agent.cwd);
    if (!ok) {
      return {
        ok: false,
        failure: {
          kind:    "cwd_missing",
          message: "Working directory not found. Update this agent's working directory before starting.",
        },
      };
    }
  }

  // ── Executable check (all agents) ─────────────────────────────────────────
  const exe = parseLaunchExecutable(agent.launchCommand);
  if (exe) {
    const available = await checkCommand(exe);
    if (!available) {
      // Use friendly preset error when the missing exe is the expected preset CLI.
      const expectedCli = PRESET_CLI[agent.agentKind ?? "custom"];
      const message =
        expectedCli && exe.toLowerCase() === expectedCli.toLowerCase()
          ? (CLI_ERROR[expectedCli] ?? `Command not found: ${exe}`)
          : `Command not found: ${exe}`;

      return {
        ok: false,
        failure: { kind: "command_missing", message },
      };
    }
  }

  return { ok: true };
}
