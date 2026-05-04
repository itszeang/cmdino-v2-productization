# CMDino Release Checklist

Status: V1.9 Alpha release prep  
Package: `0.1.0-alpha.1`  
Installer version: `0.1.0`

Use this checklist before tagging or sharing a private alpha build.

## Version Check

- [ ] `package.json` version is `0.1.0-alpha.1`.
- [ ] `src-tauri/tauri.conf.json` version is `0.1.0`.
- [ ] `src-tauri/tauri.conf.json` product name is `CMDino`.
- [ ] Main window title is `CMDino Alpha`.
- [ ] README milestone says `CMDino V1.9 Alpha`.
- [ ] README package version says `0.1.0-alpha.1`.

## Build

- [ ] Run `npm install` if dependencies changed.
- [ ] Run `npm.cmd run build`.
- [ ] Confirm TypeScript compile passes.
- [ ] Confirm Vite production build completes.
- [ ] Record any remaining build warnings in `docs/QA_REGRESSION.md`.

## Tauri Build

- [ ] Run `npm.cmd run tauri:build`.
- [ ] Confirm release EXE is generated.
- [ ] Confirm NSIS setup EXE is generated.
- [ ] Confirm MSI is generated.
- [ ] Confirm `.agents/**/*` is bundled as a Tauri resource.
- [ ] Confirm `public/preset-brains/**/*` is bundled as a Tauri resource.

Expected Windows artifacts:

```text
src-tauri/target/release/cmdino.exe
src-tauri/target/release/bundle/nsis/CMDino_0.1.0_x64-setup.exe
src-tauri/target/release/bundle/msi/CMDino_0.1.0_x64_en-US.msi
```

## Installer Smoke

- [ ] Launch `src-tauri/target/release/cmdino.exe`.
- [ ] Install with `CMDino_0.1.0_x64-setup.exe` on a clean or throwaway profile.
- [ ] Install with `CMDino_0.1.0_x64_en-US.msi` on a clean or throwaway profile.
- [ ] Confirm the app opens after each install.
- [ ] Confirm first-run onboarding appears when local settings are clean.
- [ ] Load the demo workspace.
- [ ] Start at least one valid custom command.
- [ ] Preview and send a preset brain attachment.
- [ ] Create a handoff between two running terminals.
- [ ] Use Auto Forward Lite with selected text.
- [ ] Save and reload a workspace.
- [ ] Uninstall and reinstall without blocking errors.

## Screenshots / Media

- [ ] Confirm `docs/media/hero-demo.png` is current.
- [ ] Confirm `docs/screenshots/workspace-main.png` is current.
- [ ] Confirm `docs/screenshots/deploy-agent.png` is current.
- [ ] Confirm `docs/screenshots/workflow-view.png` is current.
- [ ] Open README locally and confirm committed media links render as expected.

## README Links

- [ ] Confirm README links to `docs/QA_REGRESSION.md`.
- [ ] Confirm README links to `docs/KNOWN_ISSUES.md`.
- [ ] Confirm README links to `docs/ARCHITECTURE_RULES.md`.
- [ ] Confirm README links to `docs/DINO_ASSET_INTEGRATION_SPEC.md`.
- [ ] Confirm README lists every planned media path.
- [ ] Confirm README does not claim full terminal transcript persistence.
- [ ] Confirm README does not claim drag/drop workflow building exists.
- [ ] Confirm README does not claim public alpha access, payment, or licensing is active.

## QA Docs

- [ ] Update `docs/QA_REGRESSION.md` with the latest build date.
- [ ] Include `npm.cmd run build` result.
- [ ] Include `npm.cmd run tauri:build` result.
- [ ] Include release EXE smoke result.
- [ ] Include installer smoke result if rerun.
- [ ] Include accepted warnings and release blockers.

## Known Issues

- [ ] Review `docs/KNOWN_ISSUES.md`.
- [ ] Confirm Session History limitation is still accurate.
- [ ] Confirm Auto Forward Lite limitation is still accurate.
- [ ] Confirm workflow graph limitation is still accurate.
- [ ] Confirm installer QA limitation is updated after smoke testing.
- [ ] Confirm release/licensing limitation is still accurate.

## Final Git Status

- [ ] Run `git status --short`.
- [ ] Confirm only intended docs/media changes are present.
- [ ] Confirm generated build artifacts are not staged unless intentionally released elsewhere.
- [ ] Confirm private local settings are not staged.
- [ ] Commit release-prep docs/media changes.
- [ ] Tag only after artifacts, docs, and media are verified.
