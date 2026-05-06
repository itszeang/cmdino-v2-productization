import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowLink } from "./workflow";
import type { SessionLogEvent } from "./sessionLog";

export interface MemoryBriefFile {
  fileName: string;
  content: string;
  agentConfigId: string;
}

export interface BuildMemoryBriefsInput {
  workspaceName: string;
  agents: TerminalAgent[];
  workflowLinks: WorkflowLink[];
  sessionEntries: SessionLogEvent[];
  generatedAt: number;
}

const CANONICAL_KINDS: Record<string, string> = {
  claude:  "CLAUDE_SESSION_MEMORY.md",
  codex:   "CODEX_SESSION_MEMORY.md",
  gemini:  "GEMINI_SESSION_MEMORY.md",
  ollama:  "OLLAMA_SESSION_MEMORY.md",
};

function sanitizeLabel(label: string): string {
  const clean = label
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || "AGENT";
}

function fmtTs(ts: number): string {
  return new Date(ts).toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
}

const EARLIEST_PRODUCT_TIMESTAMP = Date.UTC(2020, 0, 1);

function isUsableTimestamp(ts: unknown): ts is number {
  return (
    typeof ts === "number" &&
    Number.isFinite(ts) &&
    ts >= EARLIEST_PRODUCT_TIMESTAMP
  );
}

function formatWorkflowUpdatedAt(ts: unknown): string {
  if (!isUsableTimestamp(ts)) return "recently configured";
  return `last updated: ${fmtTs(ts)}`;
}

function buildAttachmentsTable(agent: TerminalAgent): string {
  if (agent.attachments.length === 0) return "No attachments currently configured.\n";
  const header = "| File | Source | Path |\n| --- | --- | --- |";
  const rows = agent.attachments.map((att) => {
    const source = att.path.startsWith("cmdino-preset://") ? "preset"
      : att.source === "generated" ? "generated"
      : "user";
    return `| ${att.fileName} | ${source} | ${att.path} |`;
  });
  return `${header}\n${rows.join("\n")}\n`;
}

function formatEventType(type: string, payload: Record<string, unknown>): string {
  switch (type) {
    case "terminal_start":    return "Terminal started";
    case "terminal_restart":  return "Terminal restarted";
    case "terminal_kill":     return "Terminal killed";
    case "terminal_exited":   return "Terminal exited";
    case "terminal_error":    return "Terminal error";
    case "terminal_removed":  return "Terminal removed";
    case "agent_created":     return "Agent created";
    case "agent_updated":     return "Agent config updated";
    case "manual_send":       return "Manual text sent to terminal";
    case "preset_brain_send": {
      const name = typeof payload.fileName === "string" ? payload.fileName : "file";
      return `Preset brain sent: ${name}`;
    }
    case "manual_handoff": {
      const target =
        typeof payload.targetLabel === "string"
          ? payload.targetLabel
          : typeof payload.target === "string"
          ? payload.target
          : "unknown agent";
      return `Forwarded to ${target}`;
    }
    case "auto_forward": {
      const target =
        typeof payload.targetLabel === "string"
          ? payload.targetLabel
          : typeof payload.target === "string"
          ? payload.target
          : "next agent";
      return `Auto-forwarded to ${target}`;
    }
    case "attachment_added":   return "Attachment added";
    case "attachment_removed": return "Attachment removed";
    case "workspace_saved":    return "Workspace saved";
    case "workspace_loaded":   return "Workspace loaded";
    default:                   return type;
  }
}

function buildRecentActions(agent: TerminalAgent, entries: SessionLogEvent[]): string {
  const relevant = entries.filter(
    (ev) => ev.agentConfigId === agent.configId || ev.agentLabel === agent.label,
  );
  const limited = relevant.slice(-20);
  if (limited.length === 0) return "No matching session events recorded.\n";
  const sorted = [...limited].sort((a, b) => a.ts - b.ts);
  return sorted
    .map((ev) => `- ${fmtTs(ev.ts)} - ${formatEventType(ev.type, ev.payload)}`)
    .join("\n") + "\n";
}

function resolveAgentLabel(configId: string, agents: TerminalAgent[]): string {
  return agents.find((a) => a.configId === configId)?.label ?? configId;
}

function buildIncomingHandoffs(agent: TerminalAgent, links: WorkflowLink[], agents: TerminalAgent[]): string {
  const incoming = links.filter(
    (l) => l.targetConfigId === agent.configId && l.kind === "handoff",
  );
  if (incoming.length === 0) return "None.\n";
  return (
    incoming
      .map((l) => {
        const srcLabel = resolveAgentLabel(l.sourceConfigId, agents);
        return `- From ${srcLabel}: handoff link, count ${l.count}, ${formatWorkflowUpdatedAt(l.updatedAt)}`;
      })
      .join("\n") + "\n"
  );
}

function buildOutgoingHandoffs(agent: TerminalAgent, links: WorkflowLink[], agents: TerminalAgent[]): string {
  const outgoing = links.filter(
    (l) => l.sourceConfigId === agent.configId && l.kind === "handoff",
  );
  if (outgoing.length === 0) return "None.\n";
  return (
    outgoing
      .map((l) => {
        const tgtLabel = resolveAgentLabel(l.targetConfigId, agents);
        return `- To ${tgtLabel}: handoff link, count ${l.count}, ${formatWorkflowUpdatedAt(l.updatedAt)}`;
      })
      .join("\n") + "\n"
  );
}

function buildPreferredRoutes(agent: TerminalAgent, links: WorkflowLink[], agents: TerminalAgent[]): string {
  const outRoutes = links.filter((l) => l.sourceConfigId === agent.configId && l.kind === "route");
  const inRoutes  = links.filter((l) => l.targetConfigId === agent.configId && l.kind === "route");
  const lines: string[] = [];
  for (const l of outRoutes) {
    lines.push(`- Outgoing preferred route: ${agent.label} -> ${resolveAgentLabel(l.targetConfigId, agents)}`);
  }
  for (const l of inRoutes) {
    lines.push(`- Incoming preferred route: ${resolveAgentLabel(l.sourceConfigId, agents)} -> ${agent.label}`);
  }
  if (lines.length === 0) return "None configured.\n";
  return lines.join("\n") + "\n";
}

function bestNextTarget(agent: TerminalAgent, links: WorkflowLink[], agents: TerminalAgent[]): string {
  const route = links.find((l) => l.sourceConfigId === agent.configId && l.kind === "route");
  if (route) return resolveAgentLabel(route.targetConfigId, agents);
  const handoff = links.find((l) => l.sourceConfigId === agent.configId && l.kind === "handoff");
  if (handoff) return resolveAgentLabel(handoff.targetConfigId, agents);
  return "None configured";
}

function buildBrief(
  agent:         TerminalAgent,
  workspaceName: string,
  links:         WorkflowLink[],
  entries:       SessionLogEvent[],
  generatedAt:   number,
  allAgents:     TerminalAgent[],
): string {
  return `# CMDino Session Memory - ${agent.label}

Generated: ${fmtTs(generatedAt)}
Workspace: ${workspaceName}

## Agent Identity
- Label: ${agent.label}
- Kind: ${agent.agentKind ?? "custom"}
- Config ID: ${agent.configId}
- Dino: ${agent.dinoId}

## Launch Context
- Command: \`${agent.launchCommand ?? "(not set)"}\`
- Working directory: \`${agent.cwd ?? "(not set)"}\`

## Current Attachments
${buildAttachmentsTable(agent)}
## Recent Session Actions
${buildRecentActions(agent, entries)}
## Incoming Handoffs
${buildIncomingHandoffs(agent, links, allAgents)}
## Outgoing Handoffs
${buildOutgoingHandoffs(agent, links, allAgents)}
## Workflow Preferred Routes
${buildPreferredRoutes(agent, links, allAgents)}
## Recommended Next-Session Context Notes
- Start this agent with the command above from the working directory above.
- Reattach or send the listed attachments if the agent needs its role/context files.
- Review recent actions before asking the agent to continue.
- Preferred next handoff target: ${bestNextTarget(agent, links, allAgents)}.
- This file does not include full terminal transcripts.

## Source Limits
- Generated locally by CMDino.
- No API calls.
- No LLM summarization.
- Uses current agent config, attachment metadata, session events, and workflow links only.
`;
}

export function buildMemoryBriefs(input: BuildMemoryBriefsInput): MemoryBriefFile[] {
  const { workspaceName, agents, workflowLinks, sessionEntries, generatedAt } = input;

  const validConfigIds = new Set(agents.map((a) => a.configId));
  const activeLinks = workflowLinks.filter(
    (l) => validConfigIds.has(l.sourceConfigId) && validConfigIds.has(l.targetConfigId),
  );

  // Count agents per kind to determine canonical vs label-based filenames
  const kindCount = new Map<string, number>();
  for (const agent of agents) {
    const k = (agent.agentKind ?? "custom").toLowerCase();
    kindCount.set(k, (kindCount.get(k) ?? 0) + 1);
  }

  const usedFileNames = new Set<string>();

  return agents.map((agent) => {
    const kind = (agent.agentKind ?? "custom").toLowerCase();
    const canonical = CANONICAL_KINDS[kind];
    let fileName: string;

    if (canonical && (kindCount.get(kind) ?? 0) === 1) {
      fileName = canonical;
    } else {
      fileName = `${sanitizeLabel(agent.label)}_SESSION_MEMORY.md`;
    }

    // Dedup: if name already taken, append short config id suffix
    if (usedFileNames.has(fileName)) {
      const suffix = agent.configId.slice(0, 6).toUpperCase();
      fileName = fileName.replace("_SESSION_MEMORY.md", `_${suffix}_SESSION_MEMORY.md`);
    }
    usedFileNames.add(fileName);

    const content = buildBrief(agent, workspaceName, activeLinks, sessionEntries, generatedAt, agents);
    return { fileName, content, agentConfigId: agent.configId };
  });
}
