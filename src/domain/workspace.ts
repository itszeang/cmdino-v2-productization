import type { AgentKind } from "./agentKind";
import { inferAgentKind } from "./agentKind";
import type { WorkflowLink } from "./workflow";
import { sanitizeWorkflowLinks } from "./workflow";

export const WORKSPACE_SCHEMA_VERSION = 3 as const;

export interface PersistedAttachment {
  id:       string;
  path:     string;
  fileName: string;
}

export interface PersistedTerminalConfig {
  configId:       string;
  order:          number;
  label:          string;
  agentKind:      AgentKind;
  launchCommand?: string;
  cwd?:           string;
  dinoId:         string;
  attachments:    PersistedAttachment[];
}

export interface CmdinoWorkspaceFile {
  schemaVersion: 3;
  workspaceName: string;
  terminals:     PersistedTerminalConfig[];
  workflowLinks: WorkflowLink[];
}

const VALID_KINDS    = new Set<string>(["claude", "codex", "gemini", "ollama", "custom"]);
const VALID_DINO_IDS = new Set<string>(["female-cole", "female-kira", "female-loki", "male-cole", "male-kira"]);
const SUPPORTED_VERSIONS     = new Set([1, 2, 3]);
const MAX_WORKSPACE_TERMINALS = 12;

export function sanitizeWorkspaceFilename(name: string): string {
  const clean = name
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 64);
  return clean || "untitled_workspace";
}

function parsePersistedAttachment(a: unknown, idx: number): PersistedAttachment | null {
  if (!a || typeof a !== "object" || Array.isArray(a)) return null;
  const obj = a as Record<string, unknown>;
  const path = typeof obj.path === "string" && obj.path.trim() ? obj.path.trim() : null;
  if (!path) return null;
  return {
    id:       typeof obj.id === "string" && obj.id ? obj.id : crypto.randomUUID(),
    path,
    fileName:
      typeof obj.fileName === "string" && obj.fileName
        ? obj.fileName
        : path.split(/[/\\]/).pop() ?? `attachment_${idx}`,
  };
}

/** Accepts schemaVersion 1, 2, or 3. Throws a descriptive Error on failure. */
export function validateWorkspaceFile(data: unknown): CmdinoWorkspaceFile {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Workspace file is not a valid object.");
  }
  const obj = data as Record<string, unknown>;

  const sv = obj.schemaVersion;
  if (!SUPPORTED_VERSIONS.has(sv as number)) {
    throw new Error(
      `Unsupported schema version: ${String(sv)}. Supported: 1, 2, 3.`
    );
  }

  const workspaceName =
    typeof obj.workspaceName === "string" && obj.workspaceName.trim()
      ? obj.workspaceName.trim()
      : "Untitled Workspace";

  if (!Array.isArray(obj.terminals)) {
    throw new Error("Workspace file missing terminals array.");
  }

  if (obj.terminals.length > MAX_WORKSPACE_TERMINALS) {
    throw new Error(
      `Workspace contains ${obj.terminals.length} terminals (max ${MAX_WORKSPACE_TERMINALS}).`
    );
  }

  const terminals: PersistedTerminalConfig[] = obj.terminals.map(
    (t: unknown, i: number) => {
      if (!t || typeof t !== "object" || Array.isArray(t)) {
        throw new Error(`Terminal at index ${i} is not a valid object.`);
      }
      const term = t as Record<string, unknown>;

      const rawKind   = typeof term.agentKind === "string" ? term.agentKind : "";
      const agentKind: AgentKind = VALID_KINDS.has(rawKind)
        ? (rawKind as AgentKind)
        : inferAgentKind(
            typeof term.launchCommand === "string" ? term.launchCommand : undefined
          );

      const rawDino = typeof term.dinoId === "string" ? term.dinoId : "";
      const dinoId  = VALID_DINO_IDS.has(rawDino) ? rawDino : "female-cole";

      const rawAtts = Array.isArray(term.attachments) ? term.attachments : [];
      const attachments: PersistedAttachment[] = rawAtts
        .map((a, ai) => parsePersistedAttachment(a, ai))
        .filter((a): a is PersistedAttachment => a !== null);

      return {
        configId:
          typeof term.configId === "string" && term.configId
            ? term.configId
            : crypto.randomUUID(),
        order:
          typeof term.order === "number" && Number.isFinite(term.order) ? term.order : i,
        label:
          typeof term.label === "string" && term.label.trim()
            ? term.label.trim()
            : `Terminal ${i + 1}`,
        agentKind,
        launchCommand:
          typeof term.launchCommand === "string" && term.launchCommand.trim()
            ? term.launchCommand.trim()
            : undefined,
        cwd:
          typeof term.cwd === "string" && term.cwd.trim()
            ? term.cwd.trim()
            : undefined,
        dinoId,
        attachments,
      };
    }
  );

  // Build valid configId set for link sanitization
  const validConfigIds = new Set(terminals.map((t) => t.configId));

  // v1/v2: workflowLinks defaults to []; v3: validate provided links
  const rawLinks = Array.isArray(obj.workflowLinks) ? obj.workflowLinks : [];
  const workflowLinks: WorkflowLink[] = sanitizeWorkflowLinks(rawLinks, validConfigIds);

  return { schemaVersion: 3, workspaceName, terminals, workflowLinks };
}
