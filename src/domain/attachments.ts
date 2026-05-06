import type { TerminalAttachment } from "./orchestration";

export interface GeneratedOutputFile {
  path:       string;
  fileName:   string;
  sizeBytes:  number;
  modifiedAt: number;
  kind:       "memory_brief" | "transcript" | "text" | "markdown";
}

export type AttachmentSource = "user" | "preset" | "generated";

export function inferAttachmentSource(
  path: string,
  generatedPaths: Set<string>,
): AttachmentSource {
  if (path.startsWith("cmdino-preset://")) return "preset";
  if (generatedPaths.has(path)) return "generated";
  return "user";
}

export interface AttachmentGroups {
  uploaded:  TerminalAttachment[];
  generated: TerminalAttachment[];
  preset:    TerminalAttachment[];
}

export function groupAttachments(
  atts:           TerminalAttachment[],
  generatedPaths: Set<string>,
): AttachmentGroups {
  const uploaded:  TerminalAttachment[] = [];
  const generated: TerminalAttachment[] = [];
  const preset:    TerminalAttachment[] = [];
  for (const att of atts) {
    const src = inferAttachmentSource(att.path, generatedPaths);
    if (src === "preset")    preset.push(att);
    else if (src === "generated") generated.push(att);
    else                     uploaded.push(att);
  }
  return { uploaded, generated, preset };
}

export type OwnershipMap = Record<string, string[]>; // path -> agentLabel[]

export function buildOwnershipMap(
  agents: Array<{ label: string; attachments: TerminalAttachment[] }>,
): OwnershipMap {
  const map: OwnershipMap = {};
  for (const agent of agents) {
    for (const att of agent.attachments) {
      if (!map[att.path]) map[att.path] = [];
      map[att.path].push(agent.label);
    }
  }
  return map;
}
