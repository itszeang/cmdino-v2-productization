export interface LastSessionRecord {
  workspaceName:   string;
  workspaceSlug:   string;
  savedAt:         number;
  agentCount:      number;
  agentLabels:     string[];
  outputCount:     number;
  lastEventType?:  string;
  lastEventLabel?: string;
  lastEventAt?:    number;
}

const STORAGE_KEY = "cmdino.v1.last_session";

export function saveLastSession(record: LastSessionRecord): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch { /* quota */ }
}

export function loadLastSession(): LastSessionRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      !parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
      typeof (parsed as Record<string, unknown>).workspaceName !== "string" ||
      typeof (parsed as Record<string, unknown>).workspaceSlug !== "string"
    ) return null;
    return parsed as LastSessionRecord;
  } catch { return null; }
}

export function clearLastSession(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
}
