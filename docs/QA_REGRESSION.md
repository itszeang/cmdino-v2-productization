# CMDino Phase 1 Product Trust QA Regression

Date: 2026-05-09
Status: Final Product Trust QA pass

## Environment

| Item | Value |
| --- | --- |
| OS focus | Windows-first desktop build |
| Shell | PowerShell |
| Working directory | `C:\Users\burak\Desktop\cmdino-build` |
| App package | `cmdino@0.1.0-alpha.1` |
| Runtime | Tauri v2 |

## Build Checks

| Command | Result | Notes |
| --- | --- | --- |
| `npm.cmd run build` | PASS | TypeScript and Vite production build completed after rerun outside sandbox restrictions. |
| `cargo check` | PASS | Rust check completed in `src-tauri`; one existing dead-code warning for `ProbeOutput.duration_ms`. |
| `npm.cmd run tauri:build` | PASS | Full desktop build completed and produced release EXE plus MSI and NSIS bundles. |

Observed warnings:

- Vite reports the main JS chunk is larger than 500 kB after minification.
- Tauri warns that bundle identifier `com.cmdino.app` ends with `.app`, which is not recommended for macOS.
- Rust warns that `ProbeOutput.duration_ms` is never read.

Generated desktop artifacts:

- `src-tauri\target\release\cmdino.exe`
- `src-tauri\target\release\bundle\msi\CMDino_0.1.0_x64_en-US.msi`
- `src-tauri\target\release\bundle\nsis\CMDino_0.1.0_x64-setup.exe`

## Regression Matrix

| Area | Status | Verification |
| --- | --- | --- |
| First-run welcome CTA logic | PASS | Source verified in `WelcomeModal`: CTA tiers prefer Deploy for ready CLIs, Template for installed/custom, Health otherwise. |
| Health scan refresh lock | PASS | Source verified in `useProviderHealth`: `lockedRef` blocks concurrent scans and generation guard drops stale results. |
| Deploy modal health warnings | PASS | Source verified in `AgentCreationModal`: provider badges, selected-preset warning strip, and deploy block for missing CLI. |
| Runtime error card and history event | PASS | Source verified in `TerminalPane`, `RuntimeErrorCard`, and `HistoryDrawer`: medium/high runtime errors render and log `runtime_error`. |
| Session continuity | PASS | Source verified in `App` and `lastSession`: save/load writes lastSession, continuation loads by slug, workspace delete clears matching record. |
| Output Library preview/attach/copy/delete | PASS | Source verified in `OutputLibraryDrawer`: preview via `fileBridge`, attach to active agent, copy content/path, delete selected output with confirmation. |
| Workspace save/load/delete | PASS | Source verified in `workspaceBridge`, `App`, and Rust `workspace.rs`: save/load/list/delete scoped to app workspace storage. |
| Memory briefs generation | PASS | Source verified in `App`, `memoryBrief`, and `memoryBriefBridge`; outputs refresh after write. |
| Transcript export | PASS | Source verified in `App` and `transcriptExport`; export uses registered per-pane transcript getters and writes markdown output. |
| Build kit generation | PASS | Source verified in `buildPublicExport`; writes build update, release notes, screenshot checklist, and related markdown files. |
| Generated outputs refresh | PASS | Source verified: app refreshes after generation and Output Library refresh calls `listOutputFiles`. |
| Focus/grid no remount risk | PASS | Source verified in `TerminalGrid`: stable `agents.map` tree with CSS/data-attribute layout changes only. |
| Workflow route create/delete | PASS | Source verified in `WorkflowPanel` and `useTerminalAgents`: route mode creates links, edge remove deletes links. |
| Attachment drag/drop | PASS | Source verified in `useAttachmentDrop`: Tauri drag-drop hit tests panes, filters to `.md`/`.txt`, falls back to active agent. |

## Manual Smoke Checklist

Run these in the built desktop app before a public handoff:

1. Start with no workspace and verify Welcome CTA changes after Health refresh.
2. Open Health, press Refresh repeatedly, and confirm the button stays locked while scanning.
3. Deploy a preset whose CLI is missing and confirm deploy is blocked with a clear message.
4. Deploy a Custom Agent with a bad command, start it, and confirm runtime error card plus History entry.
5. Save a workspace, restart app, verify continuation panel, then delete that saved workspace and confirm continuation clears.
6. Generate Memory Briefs, Transcripts, and Build Kit; verify Output Library refreshes and previews files.
7. Attach an output to an active agent, delete that output, and confirm the stale attachment reference does not crash preview/send.
8. Toggle focus/grid repeatedly while a terminal is running and confirm no duplicate PTY spawn error.
9. Create and remove a workflow route in the Workflow panel.
10. Drag a `.md` or `.txt` file onto a pane and verify it lands on the intended agent.

## QA Summary

No functional bugs were found during this source and build QA pass. The build is releasable for the current Windows-first alpha constraints, with the known limitations documented in `docs/KNOWN_ISSUES.md`.
