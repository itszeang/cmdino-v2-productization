import type { TerminalAgent } from "./terminalAgent";
import type { WorkflowLink } from "./workflow";
import type { SessionLogEvent } from "./sessionLog";
import type { GeneratedOutputFile } from "./attachments";
import type { WorkflowRun, WorkflowRunStep } from "./workflowRun";

export interface MemoryBriefFile {
  fileName: string;
  content: string;
  agentConfigId: string;
  kind: "memory_brief";
}

export interface BuildMemoryBriefsInput {
  workspaceName: string;
  agents: TerminalAgent[];
  workflowLinks: WorkflowLink[];
  sessionEntries: SessionLogEvent[];
  currentRun?: WorkflowRun | null;
  outputFiles?: GeneratedOutputFile[];
  workflowArtifactPaths?: string[];
  generatedAt: number;
}

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

function bulletList(items: string[], fallback: string): string {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);
  return cleanItems.length > 0
    ? cleanItems.map((item) => `- ${item}`).join("\n") + "\n"
    : `- ${fallback}\n`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function truncateInline(value: string, limit = 360): string {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, limit - 3)}...` : clean;
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

function extractOutputText(payload: Record<string, unknown>): string {
  for (const key of ["text", "output", "content", "chunk", "cleanOutput"]) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) return truncateInline(value);
  }
  return "";
}

function buildRecentAgentOutput(agent: TerminalAgent, entries: SessionLogEvent[]): string {
  const outputs = entries
    .filter((ev) => (
      (ev.agentConfigId === agent.configId || ev.agentLabel === agent.label) &&
      ev.type === "terminal_output"
    ))
    .slice(-3)
    .map((ev) => extractOutputText(ev.payload))
    .filter(Boolean);
  return outputs.length > 0
    ? outputs.map((item) => `  - ${item}`).join("\n")
    : "  - No captured terminal output summary available.";
}

function resolveAgentLabel(configId: string, agents: TerminalAgent[]): string {
  return agents.find((a) => a.configId === configId)?.label ?? configId;
}

function parsedSummary(step: WorkflowRunStep): string {
  const parsed = asRecord(step.parsedOutput);
  const summary = typeof parsed?.summary === "string" ? parsed.summary : step.summary;
  return summary?.trim() || "No summary recorded.";
}

function parsedHandoff(step: WorkflowRunStep): string {
  const parsed = asRecord(step.parsedOutput);
  const handoff = parsed?.handoff;
  if (typeof handoff === "string") return handoff.trim();
  const record = asRecord(handoff);
  return typeof record?.message === "string" ? record.message.trim() : "";
}

function parsedNext(step: WorkflowRunStep): string[] {
  const parsed = asRecord(step.parsedOutput);
  const next = parsed?.next;
  return Array.isArray(next)
    ? next.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function buildProjectSection(workspaceName: string, agents: TerminalAgent[], generatedAt: number): string {
  return [
    `Generated: ${fmtTs(generatedAt)}`,
    `Workspace: ${workspaceName}`,
    `Agents: ${agents.length > 0 ? agents.map((agent) => agent.label).join(", ") : "No agents configured."}`,
  ].join("\n") + "\n";
}

function buildCurrentGoalSection(run?: WorkflowRun | null): string {
  if (!run) return "No active workflow run is available. Resume by reviewing the completed work and choosing the next task.\n";
  return [
    `Task: ${run.userTask || "No user task recorded."}`,
    `Mode: ${run.mode}`,
    `Status: ${run.status}`,
  ].join("\n") + "\n";
}

function buildCompletedSection(run: WorkflowRun | null | undefined, entries: SessionLogEvent[]): string {
  const completedSteps = run?.steps
    .filter((step) => step.status === "completed")
    .map((step) => `${step.label}: ${parsedSummary(step)}`) ?? [];
  const notableEvents = entries
    .filter((event) => ["manual_handoff", "auto_forward", "workspace_saved", "workspace_loaded"].includes(event.type))
    .slice(-8)
    .map((event) => `${formatEventType(event.type, event.payload)} (${event.agentLabel})`);
  return bulletList([...completedSteps, ...notableEvents], "No completed workflow steps or notable session actions recorded.");
}

function buildWorkflowStateSection(run?: WorkflowRun | null): string {
  if (!run) return "No active workflow run state was captured.\n";
  const current = run.currentStepId
    ? run.steps.find((step) => step.id === run.currentStepId)
    : null;
  const stepLines = run.steps.map((step, index) => {
    const currentMarker = step.id === run.currentStepId ? " current" : "";
    return `- ${index + 1}. ${step.label} (${step.agentRole}) - ${step.status}${currentMarker}`;
  });
  return [
    `Run ID: ${run.id}`,
    `Run status: ${run.status}`,
    `Current step: ${current ? current.label : "No active step"}`,
    `Started: ${isUsableTimestamp(run.startedAt) ? fmtTs(run.startedAt) : "not recorded"}`,
    `Completed: ${isUsableTimestamp(run.completedAt) ? fmtTs(run.completedAt) : "not recorded"}`,
    "",
    ...stepLines,
  ].join("\n") + "\n";
}

function buildArtifactPaths(outputFiles: GeneratedOutputFile[] = [], workflowArtifactPaths: string[] = []): string {
  const outputLines = outputFiles.map((file) => `${file.fileName} [${file.kind}] - ${file.path}`);
  const workflowLines = workflowArtifactPaths.map((path) => `Workflow artifact - ${path}`);
  return bulletList([...workflowLines, ...outputLines], "No Output Shelf artifacts were captured.");
}

function buildAgentOutputsSection(agents: TerminalAgent[], entries: SessionLogEvent[], outputFiles: GeneratedOutputFile[], workflowArtifactPaths: string[]): string {
  const agentSections = agents.length > 0
    ? agents.map((agent) => [
        `### ${agent.label}`,
        `- Kind: ${agent.agentKind ?? "custom"}`,
        `- Working directory: ${agent.cwd ?? "(not set)"}`,
        "- Current attachments:",
        buildAttachmentsTable(agent).trim(),
        "- Recent terminal output:",
        buildRecentAgentOutput(agent, entries),
      ].join("\n")).join("\n\n")
    : "No agents configured.";
  return [
    agentSections,
    "",
    "### Artifact Links / Paths",
    buildArtifactPaths(outputFiles, workflowArtifactPaths).trim(),
  ].join("\n") + "\n";
}

function buildDecisionsSection(run: WorkflowRun | null | undefined, links: WorkflowLink[], agents: TerminalAgent[]): string {
  const workflowDecisions = run?.steps.flatMap((step) => {
    const lines: string[] = [];
    const handoff = parsedHandoff(step);
    if (handoff) lines.push(`${step.label} handoff: ${handoff}`);
    for (const next of parsedNext(step)) lines.push(`${step.label} next: ${next}`);
    return lines;
  }) ?? [];
  const routeDecisions = links.map((link) => {
    const src = resolveAgentLabel(link.sourceConfigId, agents);
    const target = resolveAgentLabel(link.targetConfigId, agents);
    return `${src} -> ${target} (${link.kind}, count ${link.count})`;
  });
  return bulletList([...workflowDecisions, ...routeDecisions], "No explicit decisions or handoffs were recorded.");
}

function buildKnownIssuesSection(run: WorkflowRun | null | undefined, entries: SessionLogEvent[]): string {
  const failedSteps = run?.steps
    .filter((step) => step.status === "failed" || step.status === "needs_intervention")
    .map((step) => `${step.label}: ${step.status} - ${parsedSummary(step)}`) ?? [];
  const errorEvents = entries
    .filter((event) => event.type === "terminal_error" || event.type === "runtime_error")
    .slice(-8)
    .map((event) => `${event.agentLabel}: ${formatEventType(event.type, event.payload)}`);
  return bulletList([...failedSteps, ...errorEvents], "No known issues recorded.");
}

function buildNextPrompt(run: WorkflowRun | null | undefined, agents: TerminalAgent[]): string {
  if (!run) {
    return "Review this memory brief, inspect the Output Shelf artifacts, and propose the next concrete project step before making changes.";
  }
  const current = run.currentStepId
    ? run.steps.find((step) => step.id === run.currentStepId)
    : null;
  const latestNext = [...run.steps].reverse().flatMap(parsedNext)[0];
  const target = current?.label ?? agents[0]?.label ?? "the next agent";
  if (run.status === "completed") {
    return `Review the completed workflow "${run.userTask}" using this memory brief and the linked artifacts. Confirm the result, identify any missing verification, and propose the next project task.`;
  }
  return [
    `Continue the CMDino workflow for: ${run.userTask}`,
    `Target checkpoint/agent: ${target}`,
    latestNext ? `Use this next action: ${latestNext}` : "Review the current workflow state, then continue only after the user confirms the next checkpoint.",
    "Preserve the explicit human review step before sending or applying follow-up work.",
  ].join("\n");
}

function buildBrief(
  workspaceName: string,
  agents: TerminalAgent[],
  links: WorkflowLink[],
  entries: SessionLogEvent[],
  currentRun: WorkflowRun | null | undefined,
  outputFiles: GeneratedOutputFile[],
  workflowArtifactPaths: string[],
  generatedAt: number,
): string {
  return `# CMDino Memory Brief

## Project
${buildProjectSection(workspaceName, agents, generatedAt)}
## Current Goal
${buildCurrentGoalSection(currentRun)}
## Completed
${buildCompletedSection(currentRun, entries)}
## Current Workflow State
${buildWorkflowStateSection(currentRun)}
## Agent Outputs
${buildAgentOutputsSection(agents, entries, outputFiles, workflowArtifactPaths)}
## Decisions
${buildDecisionsSection(currentRun, links, agents)}
## Known Issues
${buildKnownIssuesSection(currentRun, entries)}
## Next Recommended Prompt
\`\`\`text
${buildNextPrompt(currentRun, agents)}
\`\`\`

## Source Limits
- Generated locally by CMDino.
- No API calls.
- No LLM summarization.
- Uses current project/workflow state, agent config, attachment metadata, session events, and Output Shelf metadata only.
`;
}

export function buildMemoryBriefs(input: BuildMemoryBriefsInput): MemoryBriefFile[] {
  const {
    workspaceName,
    agents,
    workflowLinks,
    sessionEntries,
    currentRun,
    outputFiles = [],
    workflowArtifactPaths = [],
    generatedAt,
  } = input;

  const validConfigIds = new Set(agents.map((a) => a.configId));
  const activeLinks = workflowLinks.filter(
    (l) => validConfigIds.has(l.sourceConfigId) && validConfigIds.has(l.targetConfigId),
  );

  const content = buildBrief(
    workspaceName,
    agents,
    activeLinks,
    sessionEntries,
    currentRun,
    outputFiles,
    workflowArtifactPaths,
    generatedAt,
  );

  return [{
    fileName: `${sanitizeLabel(workspaceName)}_PROJECT_MEMORY_BRIEF.md`,
    content,
    agentConfigId: "project",
    kind: "memory_brief",
  }];
}
