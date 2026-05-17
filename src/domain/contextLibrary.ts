export type ContextTarget = "global" | "agent";

export interface ContextLibraryFile {
  id: string;
  title: string;
  target: ContextTarget;
  agentId?: string;
  agentLabel?: string;
  relativePath: string;
  createdAt: string;
  updatedAt: string;
}

export interface CmdinoContextManifest {
  version: 1;
  projectRoot: string;
  files: ContextLibraryFile[];
}

export interface ContextReferenceGroups {
  global: string[];
  agent: string[];
}

export function createEmptyContextManifest(projectRoot: string): CmdinoContextManifest {
  return {
    version: 1,
    projectRoot,
    files: [],
  };
}

export function slugifyContextPart(value: string, fallback = "context"): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
  return slug || fallback;
}

export function buildContextRelativePath(input: {
  title: string;
  target: ContextTarget;
  agentLabel?: string;
  existingRelativePaths?: string[];
}): string {
  const baseName = slugifyContextPart(input.title);
  const existing = new Set(
    (input.existingRelativePaths ?? []).map((path) => path.toLowerCase()),
  );
  const dir = input.target === "global"
    ? ".cmdino/context/global"
    : `.cmdino/context/agents/${slugifyContextPart(input.agentLabel ?? "agent", "agent")}`;

  let candidate = `${dir}/${baseName}.md`;
  let suffix = 2;
  while (existing.has(candidate.toLowerCase())) {
    candidate = `${dir}/${baseName}-${suffix}.md`;
    suffix += 1;
  }
  return candidate;
}

export function addContextManifestFile(
  manifest: CmdinoContextManifest,
  input: Omit<ContextLibraryFile, "id" | "createdAt" | "updatedAt"> & {
    now?: string;
  },
): CmdinoContextManifest {
  const now = input.now ?? new Date().toISOString();
  const file: ContextLibraryFile = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    target: input.target,
    agentId: input.agentId,
    agentLabel: input.agentLabel,
    relativePath: input.relativePath,
    createdAt: now,
    updatedAt: now,
  };
  return {
    ...manifest,
    files: [...manifest.files, file],
  };
}

export function sanitizeContextManifest(value: unknown, projectRoot: string): CmdinoContextManifest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createEmptyContextManifest(projectRoot);
  }
  const raw = value as Record<string, unknown>;
  const rawFiles = Array.isArray(raw.files) ? raw.files : [];
  const files: ContextLibraryFile[] = rawFiles.flatMap((item): ContextLibraryFile[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const file = item as Record<string, unknown>;
    const title = typeof file.title === "string" && file.title.trim() ? file.title.trim() : "";
    const target = file.target === "global" || file.target === "agent" ? file.target : null;
    const relativePath = typeof file.relativePath === "string" && file.relativePath.trim()
      ? file.relativePath.trim().replace(/\\/g, "/")
      : "";
    if (!title || !target || !relativePath.startsWith(".cmdino/context/")) return [];
    return [{
      id: typeof file.id === "string" && file.id ? file.id : crypto.randomUUID(),
      title,
      target,
      agentId: typeof file.agentId === "string" && file.agentId ? file.agentId : undefined,
      agentLabel: typeof file.agentLabel === "string" && file.agentLabel ? file.agentLabel : undefined,
      relativePath,
      createdAt: typeof file.createdAt === "string" && file.createdAt ? file.createdAt : new Date().toISOString(),
      updatedAt: typeof file.updatedAt === "string" && file.updatedAt ? file.updatedAt : new Date().toISOString(),
    }];
  });

  return {
    version: 1,
    projectRoot,
    files,
  };
}

export function selectContextReferences(
  manifest: CmdinoContextManifest | null,
  input: {
    agentId?: string | null;
    agentLabel?: string | null;
  },
): ContextReferenceGroups {
  if (!manifest) return { global: [], agent: [] };
  const normalize = (value?: string | null) => slugifyContextPart(value ?? "", "");
  const agentId = input.agentId ?? "";
  const agentLabelSlug = normalize(input.agentLabel);
  const global = manifest.files
    .filter((file) => file.target === "global")
    .map((file) => file.relativePath);
  const agent = manifest.files
    .filter((file) => {
      if (file.target !== "agent") return false;
      if (agentId && file.agentId === agentId) return true;
      return agentLabelSlug !== "" && normalize(file.agentLabel) === agentLabelSlug;
    })
    .map((file) => file.relativePath);
  return { global, agent };
}
