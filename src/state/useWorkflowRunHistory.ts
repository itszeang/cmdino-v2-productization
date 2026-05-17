import { useCallback, useState } from "react";
import type { WorkflowRun } from "../domain/workflowRun";
import {
  appendWorkflowRunArtifactPaths,
  buildWorkflowRunHistoryEntry,
  parseWorkflowRunHistory,
  upsertWorkflowRunHistoryEntry,
  WORKFLOW_RUN_HISTORY_STORAGE_KEY,
  type WorkflowRunHistoryEntry,
} from "../domain/workflowRunHistory";

function readEntries(): WorkflowRunHistoryEntry[] {
  try {
    return parseWorkflowRunHistory(window.localStorage.getItem(WORKFLOW_RUN_HISTORY_STORAGE_KEY));
  } catch {
    return [];
  }
}

function writeEntries(entries: WorkflowRunHistoryEntry[]) {
  try {
    window.localStorage.setItem(WORKFLOW_RUN_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Workflow history is local convenience state; the active workflow should continue.
  }
}

export function useWorkflowRunHistory() {
  const [entries, setEntries] = useState(readEntries);

  const saveRun = useCallback((run: WorkflowRun, input: {
    projectName?: string;
    agentTeamName?: string;
  } = {}) => {
    setEntries((previous) => {
      const next = upsertWorkflowRunHistoryEntry(
        previous,
        buildWorkflowRunHistoryEntry(run, {
          projectName: input.projectName,
          agentTeamName: input.agentTeamName,
        }),
      );
      writeEntries(next);
      return next;
    });
  }, []);

  const addArtifactPaths = useCallback((runId: string, paths: string[]) => {
    setEntries((previous) => {
      const next = appendWorkflowRunArtifactPaths(previous, runId, paths);
      writeEntries(next);
      return next;
    });
  }, []);

  return {
    entries,
    saveRun,
    addArtifactPaths,
  };
}
