# Product Trust QA

Date: 2026-05-09
Scope: Phase 1 final QA for local-first trust systems.

## Systems Verified

| System | Source verification |
| --- | --- |
| Health and Readiness | Health scan bridge, refresh lock, provider health UI, deploy gate, and per-agent start/restart readiness guards are present. |
| Human-readable Runtime Errors | Runtime classifier feeds `RuntimeErrorCard`; errors are surfaced in pane UI and recorded in History. |
| First-run Welcome | Welcome CTA logic adapts to provider health and supports Health, Template, Demo, Empty, and Deploy paths. |
| Session Continuity | Last-session state is written on save/load, shown in empty workspace, and cleared when its saved workspace is deleted. |
| Output Library | Generated output metadata lists local artifacts; preview, attach, copy, refresh, and selected-file delete are present. |
| Workspace and Artifact Management | Saved workspace delete and generated output delete use confirmation and scoped Rust filesystem commands. |
| Workspace Templates | Template picker loads prebuilt workspace configs into normal workspace state. |
| Attachment System | Drag/drop, generated attachments, preset brains, preview, send, remove, and copy path flows are present. |
| Export Tools | Memory Briefs, Transcripts, and Build Kit write local markdown artifacts and refresh generated output metadata. |

## Safety Findings

- Workspace deletion accepts a workspace slug and resolves it through the same safe filename path used for save/load.
- Output deletion accepts a file name, not an arbitrary path, and only deletes `.md`/`.txt` files under the app outputs folder.
- No recursive delete path was found.
- Destructive actions use confirmation copy before deletion.
- Deleting an output does not mutate agent attachment references, matching V1 scope.

## Build Results

- `npm.cmd run build`: PASS
- `cargo check`: PASS with one existing warning
- `npm.cmd run tauri:build`: PASS

## Remaining Manual Smoke

The pass was source and build focused. Before external release, run an interactive desktop smoke on the produced `cmdino.exe` or installer:

1. Health refresh and deploy modal warnings.
2. Save, load, and delete a workspace.
3. Generate and delete an output file.
4. Attach a generated output, then delete the file and preview the stale attachment.
5. Toggle focus/grid while a terminal is live.
6. Create and remove a workflow route.
