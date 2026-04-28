# CMDino V1 Alpha — Packaging Checklist
Version: 0.1.0
Status: Pre-release QA Gate

---

## 1. Build Commands

### Frontend + Tauri (Production Installer)

```bash
npm run tauri:build
```

Runs: `tsc && vite build` → Tauri bundler → platform installer.

### Frontend Only (Verify No TS Errors)

```bash
npm run build
```

### Dev Mode (Local Testing)

```bash
npm run tauri:dev
```

---

## 2. Installer Artifact Locations

### Windows

```
src-tauri/target/release/bundle/msi/CMDino_0.1.0_x64_en-US.msi
src-tauri/target/release/bundle/nsis/CMDino_0.1.0_x64-setup.exe
```

### macOS

```
src-tauri/target/release/bundle/dmg/CMDino_0.1.0_x64.dmg
src-tauri/target/release/bundle/macos/CMDino.app
```

### Linux

```
src-tauri/target/release/bundle/deb/cmdino_0.1.0_amd64.deb
src-tauri/target/release/bundle/appimage/cmdino_0.1.0_amd64.AppImage
```

---

## 3. Pre-Build Checklist

- [ ] `package.json` version = `0.1.0`
- [ ] `src-tauri/tauri.conf.json` version = `0.1.0` (MSI requires numeric-only; pre-release label dropped from installer)
- [ ] `src-tauri/tauri.conf.json` productName = `CMDino`
- [ ] Window title = `CMDino Alpha`
- [ ] `npm run build` exits clean (no TS errors, no Vite errors)
- [ ] All icons present in `src-tauri/icons/` (32x32, 128x128, 128x128@2x, icon.icns, icon.ico)
- [ ] No `console.error` spam in dev mode

---

## 4. QA Checklist

### Startup

- [ ] App launches without crash
- [ ] Welcome modal appears on first run
- [ ] Window title shows "CMDino Alpha"

### Terminal Core

- [ ] Create new terminal pane
- [ ] PTY starts, shell responds to keystrokes
- [ ] Terminal output renders correctly in xterm
- [ ] Resize terminal pane → xterm reflows
- [ ] Remove terminal pane → PTY session killed cleanly

### Dino Runtime

- [ ] DinoLane visible in each pane
- [ ] Idle animation plays on clean terminal
- [ ] Dino state changes on output triggers (running, error, done, etc.)
- [ ] No animation flicker under 1200ms cooldown
- [ ] Dino stays inside lane bounds (10%–90%)

### Workspace

- [ ] Save workspace → JSON persisted locally
- [ ] Load workspace → terminals restored in stopped state
- [ ] Recent workspaces list populates

### Attachments + Handoff

- [ ] Attach skill.md to terminal
- [ ] Preview attachment content
- [ ] Send attachment to terminal input
- [ ] Capture terminal output
- [ ] Manual handoff to another terminal

### Settings

- [ ] Settings panel opens
- [ ] Settings changes persist across app restart

### Onboarding

- [ ] Demo workspace loads without error
- [ ] Welcome modal dismisses and does not reappear

---

## 5. Known Alpha Limitations

- Workspace does not auto-restart PTY sessions on load (stopped state only).
- No cloud sync. Local JSON persistence only.
- No user accounts or billing.
- Workflow canvas is manual-only. No autonomous handoffs.
- Max tested panes: 6. Spec allows 12; performance not validated at scale.

---

## 6. Distribution Notes

- Ship as unsigned alpha. Inform users they may see OS security warnings.
- Windows: users may need to click "More info → Run anyway" on NSIS installer.
- macOS: users may need `System Settings → Privacy & Security → Open Anyway`.
- Linux: AppImage users must `chmod +x` before running.
- Label all downloads clearly: **CMDino 0.1.0 — Early Alpha. Not production software.**
- Do not submit to Mac App Store or Windows Store for this alpha.
- Distribute via GitHub Releases or direct link only.

---

## 7. Release Artifact Naming Convention

```
CMDino-0.1.0-windows-x64.exe
CMDino-0.1.0-macos-x64.dmg
CMDino-0.1.0-linux-x64.AppImage
```

---

## 8. Post-Release

- [ ] Tag git commit: `git tag v0.1.0`
- [ ] Push tag: `git push origin v0.1.0`
- [ ] Create GitHub Release with installers attached
- [ ] Add release notes linking to this checklist
