import { useState, useCallback } from "react";
import type { SessionLogEvent } from "../domain/sessionLog";
import { DRAWER_EVENT_CAP } from "../domain/sessionLog";

const STORAGE_KEY = "cmdino.v1.session_log";

function loadLog(): SessionLogEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? (parsed as SessionLogEvent[]).slice(-DRAWER_EVENT_CAP)
      : [];
  } catch {
    return [];
  }
}

function saveLog(entries: SessionLogEvent[]): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(entries.slice(-DRAWER_EVENT_CAP)),
    );
  } catch { /* quota exceeded — skip */ }
}

export function useSessionLog() {
  const [entries, setEntries] = useState<SessionLogEvent[]>(loadLog);

  const appendEvent = useCallback((event: SessionLogEvent) => {
    setEntries((prev) => {
      const next = [...prev, event].slice(-DRAWER_EVENT_CAP);
      saveLog(next);
      return next;
    });
  }, []);

  const clearLog = useCallback(() => {
    setEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { entries, appendEvent, clearLog };
}
