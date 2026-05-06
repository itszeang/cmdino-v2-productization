export type WorkflowLinkKind = "handoff" | "skill_send" | "route";

export interface WorkflowLink {
  id:             string;
  sourceConfigId: string;
  targetConfigId: string;
  kind:           WorkflowLinkKind;
  count:          number;
  updatedAt:      number;
}

/** Upsert: same source+target+kind increments count, else inserts new link. */
export function upsertWorkflowLink(
  links:          WorkflowLink[],
  sourceConfigId: string,
  targetConfigId: string,
  kind:           WorkflowLinkKind,
): WorkflowLink[] {
  const idx = links.findIndex(
    (l) =>
      l.sourceConfigId === sourceConfigId &&
      l.targetConfigId === targetConfigId &&
      l.kind === kind,
  );
  if (idx >= 0) {
    return links.map((l, i) =>
      i === idx ? { ...l, count: l.count + 1, updatedAt: Date.now() } : l,
    );
  }
  return [
    ...links,
    {
      id:             crypto.randomUUID(),
      sourceConfigId,
      targetConfigId,
      kind,
      count:          1,
      updatedAt:      Date.now(),
    },
  ];
}

export function removeWorkflowLink(links: WorkflowLink[], id: string): WorkflowLink[] {
  return links.filter((l) => l.id !== id);
}

export function removeLinksForConfigId(links: WorkflowLink[], configId: string): WorkflowLink[] {
  return links.filter(
    (l) => l.sourceConfigId !== configId && l.targetConfigId !== configId,
  );
}

const VALID_KINDS = new Set<string>(["handoff", "skill_send", "route"]);

export interface WorkflowNodePosition {
  x: number;
  y: number;
}

export type WorkflowNodePositions = Record<string, WorkflowNodePosition>;

export function sanitizeWorkflowNodePositions(
  raw:            unknown,
  validConfigIds: Set<string>,
): WorkflowNodePositions {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const result: WorkflowNodePositions = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!validConfigIds.has(k)) continue;
    if (!v || typeof v !== "object" || Array.isArray(v)) continue;
    const pos = v as Record<string, unknown>;
    const x = typeof pos.x === "number" && Number.isFinite(pos.x) ? pos.x : 0;
    const y = typeof pos.y === "number" && Number.isFinite(pos.y) ? pos.y : 0;
    result[k] = { x, y };
  }
  return result;
}

export function removeWorkflowNodePosition(
  positions: WorkflowNodePositions,
  configId:  string,
): WorkflowNodePositions {
  if (!(configId in positions)) return positions;
  const next = { ...positions };
  delete next[configId];
  return next;
}

export function resetWorkflowNodePositions(): WorkflowNodePositions {
  return {};
}

/** Upsert a route link. Enforces one outgoing route per source by removing older routes from same source first. */
export function upsertWorkflowRoute(
  links:          WorkflowLink[],
  sourceConfigId: string,
  targetConfigId: string,
): WorkflowLink[] {
  if (sourceConfigId === targetConfigId) return links;
  // Remove existing route links from same source
  const filtered = links.filter(
    (l) => !(l.kind === "route" && l.sourceConfigId === sourceConfigId),
  );
  // Check if exact route already exists (shouldn't after filter, but be safe)
  const existing = filtered.find(
    (l) => l.kind === "route" && l.sourceConfigId === sourceConfigId && l.targetConfigId === targetConfigId,
  );
  if (existing) {
    return filtered.map((l) => l === existing ? { ...l, updatedAt: Date.now() } : l);
  }
  return [
    ...filtered,
    {
      id:             crypto.randomUUID(),
      sourceConfigId,
      targetConfigId,
      kind:           "route" as WorkflowLinkKind,
      count:          1,
      updatedAt:      Date.now(),
    },
  ];
}

/** Parse and sanitize raw unknown[] from JSON. Drops malformed or stale entries. */
export function sanitizeWorkflowLinks(
  raw:            unknown[],
  validConfigIds: Set<string>,
): WorkflowLink[] {
  return raw
    .filter((l): l is Record<string, unknown> =>
      !!l && typeof l === "object" && !Array.isArray(l),
    )
    .filter((l) => {
      const src  = l.sourceConfigId;
      const tgt  = l.targetConfigId;
      const kind = l.kind;
      return (
        typeof src === "string" && validConfigIds.has(src) &&
        typeof tgt === "string" && validConfigIds.has(tgt) &&
        typeof kind === "string" && VALID_KINDS.has(kind) &&
        src !== tgt
      );
    })
    .map((l) => ({
      id:             typeof l.id === "string" && l.id ? l.id : crypto.randomUUID(),
      sourceConfigId: l.sourceConfigId as string,
      targetConfigId: l.targetConfigId as string,
      kind:           l.kind as WorkflowLinkKind,
      count:
        typeof l.count === "number" && Number.isFinite(l.count) && l.count >= 1
          ? Math.floor(l.count)
          : 1,
      updatedAt:
        typeof l.updatedAt === "number" ? l.updatedAt : Date.now(),
    }));
}
