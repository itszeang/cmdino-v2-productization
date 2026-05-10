# CMDino Closed Alpha QA Kit

This folder is the CMDino closed-alpha QA kit. Copy it to a clean Windows machine or share it with early testers alongside the CMDino installer.

## What CMDino Is

CMDino Alpha is a local-first desktop workspace for running multiple AI CLI agents as real local terminals. It helps users start agents, add context files, hand off work between agents, save workspaces, and inspect generated outputs.

CMDino does not include Claude, Codex, Gemini, or Ollama. It checks and runs CLI tools that are already installed and authenticated on the tester's machine.

## Who This Kit Is For

Use this kit for:

- Internal clean-machine installer QA.
- Closed-alpha testers.
- Non-expert vibe coders who can follow a short checklist and report confusing moments.

## Expected Installer Location

Place installer files in `qa-release/installers/` before sharing this kit.

Expected source paths from the build machine:

- NSIS setup: `src-tauri/target/release/bundle/nsis/CMDino_0.1.0_x64-setup.exe`
- MSI installer: `src-tauri/target/release/bundle/msi/CMDino_0.1.0_x64_en-US.msi`

You can run `qa-release/PACKAGE_QA_KIT.ps1` from the repo root to copy existing installers into this kit if they are present.

## Recommended Test Order

1. Read `QUICKSTART.md`.
2. Install CMDino using the NSIS setup or MSI.
3. Complete `CLOSED_ALPHA_TESTER_TASKS.md`.
4. Use `BUG_REPORT_TEMPLATE.md` for bugs or confusing moments.
5. For full internal QA, run `CLEAN_MACHINE_QA.md`.

## Where To Report Bugs

Feedback form: `TODO: add closed alpha feedback form URL`

Until the form exists, send the completed bug template, screenshots, and videos to the CMDino maintainer.

## Alpha Warning

This is an unsigned alpha build. Windows SmartScreen may warn before install. That is expected for this phase.

CMDino is local-first and has no cloud sync, account system, payment gate, or autonomous execution in this alpha.
