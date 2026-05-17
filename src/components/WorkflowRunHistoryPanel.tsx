import { useEffect, useMemo, useState } from "react";
import {
  isWorkflowRunResumable,
  prioritizeWorkflowRunHistory,
  workflowRunStatusLabel,
  type WorkflowRunHistoryEntry,
} from "../domain/workflowRunHistory";

interface WorkflowRunHistoryPanelProps {
  entries: WorkflowRunHistoryEntry[];
  currentProjectId?: string;
  onClose: () => void;
  onResumeRun: (entry: WorkflowRunHistoryEntry) => { ok: boolean; message: string };
  onOpenOutputLibrary?: () => void;
}

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 172_800_000) return "yesterday";
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

function statusTone(status: string): string {
  if (status === "completed") return "var(--success)";
  if (status === "failed" || status === "cancelled") return "var(--danger)";
  if (status === "paused_for_intervention") return "var(--warning)";
  return "var(--accent)";
}

function handoffFromStep(step: WorkflowRunHistoryEntry["run"]["steps"][number]): string {
  const parsed = step.parsedOutput as { handoff?: unknown } | undefined;
  return typeof parsed?.handoff === "string" ? parsed.handoff : "";
}

export function WorkflowRunHistoryPanel({
  entries,
  currentProjectId,
  onClose,
  onResumeRun,
  onOpenOutputLibrary,
}: WorkflowRunHistoryPanelProps) {
  const orderedEntries = useMemo(
    () => prioritizeWorkflowRunHistory(entries, currentProjectId),
    [entries, currentProjectId],
  );
  const [selectedId, setSelectedId] = useState(orderedEntries[0]?.id ?? "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (orderedEntries.length === 0) {
      setSelectedId("");
      return;
    }
    if (!orderedEntries.some((entry) => entry.id === selectedId)) {
      setSelectedId(orderedEntries[0].id);
    }
  }, [orderedEntries, selectedId]);

  const selected = orderedEntries.find((entry) => entry.id === selectedId) ?? orderedEntries[0] ?? null;
  const projectCount = currentProjectId
    ? entries.filter((entry) => entry.projectWorkspaceId === currentProjectId).length
    : entries.length;

  function handleResume() {
    if (!selected) return;
    const result = onResumeRun(selected);
    setNotice(result.message);
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.35)",
          zIndex: 200,
        }}
      />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: 720,
        maxWidth: "calc(100vw - 24px)",
        background: "var(--surface-1)",
        borderLeft: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        zIndex: 201,
        boxShadow: "-12px 0 32px rgba(0,0,0,0.28)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "14px 16px 12px",
          borderBottom: "1px solid var(--border-subtle)",
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 750 }}>
              Workflow History
            </div>
            <div style={{ color: "var(--text-faint)", fontSize: 10, marginTop: 2 }}>
              {currentProjectId ? `${projectCount} run${projectCount === 1 ? "" : "s"} for this project` : "Recent local workflow runs"}
            </div>
          </div>
          <button className="cmd-icon-btn" onClick={onClose} title="Close">x</button>
        </div>

        {notice && (
          <div style={{
            margin: "10px 16px 0",
            border: "1px solid var(--border-subtle)",
            borderRadius: 8,
            padding: "8px 10px",
            color: notice.startsWith("Resumed") ? "var(--success)" : "var(--warning)",
            fontSize: 11,
          }}>
            {notice}
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "260px minmax(0, 1fr)" }}>
          <div style={{
            borderRight: "1px solid var(--border-subtle)",
            overflowY: "auto",
            padding: "10px 8px 16px",
          }}>
            {orderedEntries.length === 0 ? (
              <div style={{
                padding: 18,
                color: "var(--text-muted)",
                fontSize: 12,
                lineHeight: 1.5,
              }}>
                No workflow runs yet. Start a checkpoint workflow from Chat and CMDino will keep a local history here.
              </div>
            ) : orderedEntries.map((entry) => {
              const active = entry.id === selected?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => { setSelectedId(entry.id); setNotice(""); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: active ? "var(--button-bg)" : "transparent",
                    border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                    borderRadius: 8,
                    padding: 10,
                    marginBottom: 6,
                    color: "inherit",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div style={{
                    color: "var(--text-main)",
                    fontSize: 12,
                    fontWeight: 750,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {entry.userTask || "Untitled workflow"}
                  </div>
                  <div style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: 6,
                    color: "var(--text-faint)",
                    fontSize: 10,
                  }}>
                    <span style={{ color: statusTone(entry.status), fontWeight: 750 }}>
                      {workflowRunStatusLabel(entry.status)}
                    </span>
                    <span>{entry.completedStepCount}/{entry.stepCount} steps</span>
                    <span>{relTime(entry.updatedAt)}</span>
                  </div>
                  <div style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 5 }}>
                    {entry.agentTeamName ?? "Workflow team"}
                    {entry.artifactPaths?.length ? ` - ${entry.artifactPaths.length} artifact${entry.artifactPaths.length === 1 ? "" : "s"}` : ""}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{ minWidth: 0, overflowY: "auto", padding: "14px 16px 22px" }}>
            {!selected ? (
              <div style={{ color: "var(--text-muted)", fontSize: 12 }}>
                Select a workflow run to inspect its steps and saved artifacts.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ color: "var(--text-faint)", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    User Task
                  </div>
                  <div style={{ color: "var(--text-main)", fontSize: 16, fontWeight: 750, lineHeight: 1.35, marginTop: 3 }}>
                    {selected.userTask || "Untitled workflow"}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
                  {[
                    ["Project", selected.projectName ?? selected.projectWorkspaceId ?? "No project recorded"],
                    ["Team", selected.agentTeamName ?? selected.agentTeamId ?? "No team recorded"],
                    ["Status", workflowRunStatusLabel(selected.status)],
                    ["Updated", new Date(selected.updatedAt).toLocaleString()],
                  ].map(([label, value]) => (
                    <div key={label} style={{
                      background: "var(--surface-0)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      padding: 10,
                      minWidth: 0,
                    }}>
                      <div style={{ color: "var(--text-faint)", fontSize: 9, textTransform: "uppercase", letterSpacing: 0.6 }}>
                        {label}
                      </div>
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                {isWorkflowRunResumable(selected) && (
                  <button
                    type="button"
                    className="chat-submit-btn"
                    style={{ alignSelf: "flex-start" }}
                    onClick={handleResume}
                  >
                    Resume Run
                  </button>
                )}

                <div style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 10,
                }}>
                  <div style={{ color: "var(--text-main)", fontSize: 12, fontWeight: 750, marginBottom: 8 }}>
                    Steps
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {selected.run.steps.map((step, index) => (
                      <div key={step.id} style={{
                        border: "1px solid var(--border-subtle)",
                        borderRadius: 8,
                        padding: 9,
                        background: "var(--surface-1)",
                      }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ color: "var(--text-main)", fontSize: 11 }}>
                            {index + 1}. {step.label}
                          </strong>
                          <span style={{ color: "var(--text-faint)", fontSize: 10 }}>
                            {step.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        {step.summary && (
                          <div style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5, marginTop: 6 }}>
                            Summary: {step.summary}
                          </div>
                        )}
                        {handoffFromStep(step) && (
                          <div style={{ color: "var(--text-faint)", fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
                            Handoff: {handoffFromStep(step)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selected.run.finalOutput && (
                  <div style={{
                    background: "var(--terminal-bg)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: 8,
                    padding: 10,
                    color: "#e5e5e5",
                    fontSize: 10,
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                    fontFamily: "\"Cascadia Code\", \"Consolas\", monospace",
                  }}>
                    {selected.run.finalOutput}
                  </div>
                )}

                <div style={{
                  background: "var(--surface-0)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 8,
                  padding: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                    <strong style={{ color: "var(--text-main)", fontSize: 12 }}>Linked Artifacts</strong>
                    {onOpenOutputLibrary && selected.artifactPaths?.length ? (
                      <button type="button" className="chat-ghost-btn" onClick={onOpenOutputLibrary}>Open Output Shelf</button>
                    ) : null}
                  </div>
                  {selected.artifactPaths?.length ? (
                    <div style={{ display: "grid", gap: 5, marginTop: 8 }}>
                      {selected.artifactPaths.map((path) => (
                        <code key={path} style={{ color: "var(--text-faint)", fontSize: 10, wordBreak: "break-all" }}>
                          {path}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 8 }}>
                      No Output Shelf artifacts are linked to this workflow run yet.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
