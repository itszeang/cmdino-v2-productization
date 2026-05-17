# CMDino Guncel Durum Raporu

Tarih: 2026-05-17  
Repo: `itszeang/cmdino-v2-productization`  
Dal: `main`

## Yonetici Ozeti

CMDino su anda React + Vite tabanli bir masaustu arayuzu, Tauri v2 Rust backend'i ve Vitest unit test katmanindan olusuyor. Mevcut calisma agaci V2 productization kapsaminda ciddi bir genisleme icermektedir: proje secme akisi, ana gorev chat'i, agent takim secimi, context library, workflow orchestration, intervention modeli, workflow run history, artifact uretimi ve Windows installer ciktilari eklenmistir.

Push oncesi teknik dogrulama:

- `npm.cmd run build`: basarili.
- `npm.cmd run test:unit`: basarili, 18 test dosyasi / 115 test.
- `cargo check --manifest-path src-tauri\Cargo.toml`: basarili, sadece `readiness.rs` icinde kullanilmayan `duration_ms` alani uyarisi var.

Bilinen dikkat noktasi:

- `package.json` icindeki `test:e2e:tauri` script'i hala `test/wdio.conf.ts` dosyasina bakiyor; bu dosya mevcut calisma agacinda silinmis durumda. Unit/build saglam, fakat e2e komutu bu haliyle calismaz.
- `src/components/MarkdownArtifactReader.tsx.tmp` yeni ve gecici uzantili bir dosya olarak duruyor. Icerik amacli tutulduysa adlandirma netlestirilmeli; degilse sonraki temizlikte kaldirilabilir.

## Uygulama Mimarisi

### Frontend

Frontend `src/` altinda React 18 ile kuruludur. `src/App.tsx` uygulama orkestrasyon merkezi olarak calisir; agent state, proje state'i, chat, workflow run state'i, context manifest, output library ve Tauri bridge'lerini birlestirir. UI, component bazli ayrilmis ve `src/index.css` icinde buyuk bir tasarim sistemi / layout katmani ile desteklenmistir.

Ana kullanici yuzeyleri:

- Proje acma ve son projeler: `ProjectOpenScreen`, `SavedWorkspaceBrowser`, `useProjectWorkspace`.
- Ana gorev chat'i: `MainTaskChat`, `useCmdinoChat`, `cmdinoChat`.
- Agent grid ve terminal izleme: `TerminalGrid`, `TerminalPane`, `useTerminalProcess`, `terminalBridge`.
- Workflow haritasi ve calisma gecmisi: `WorkflowPanel`, `WorkflowRunTimeline`, `WorkflowRunHistoryPanel`, `useWorkflowOrchestrator`.
- Context ve artifact yonetimi: `ContextLibraryModal`, `AttachmentPanel`, `OutputLibraryDrawer`, `MarkdownArtifactReader`.

### Backend

Backend `src-tauri/` altinda Tauri v2 uygulamasidir. `src-tauri/src/lib.rs`, frontend tarafindan cagrilan komutlari register eder. Backend sorumluluklari:

- Terminal process lifecycle: spawn, write, resize, kill.
- Workspace dosya kaydetme/yukleme/silme.
- Dosya onizleme ve preset brain okuma.
- Provider readiness ve health scan.
- Memory brief, prompt file ve output file yazimi.
- Project context manifest ve context dosyalari okuma/yazma.

### Domain Katmani

`src/domain/` dosyalari UI'dan bagimsiz is kurallarini tasir. Bu katman yeni V2 kapsaminda genislemistir:

- Agent cwd cozumleme ve mismatch tespiti.
- Agent takimlari ve workflow route uretimi.
- Chat mesaj modelleri.
- Context manifest ve referans secimi.
- Handoff protokolu.
- Intervention ve recovery aksiyonlari.
- Workflow run, result capture, artifact ve final summary uretimi.

### Test Durumu

Unit test kapsami domain ve orchestration mantigina odaklidir. Guncel test dosyalari; agent cwd, target suggestion, agent team, chat, context library, handoff protocol, intervention, project detection, output library, workflow artifacts, workflow prompt send, workflow result capture, workflow run history, workflow summary, parser ve prompt builder davranislarini kontrol eder.

## Dosya Envanteri

Repo tracked dosya sayisi: 543. Kaba dagilim:

- `.agents/`: 4 agent instruction dosyasi.
- `.claude/`: 1 yerel Claude izin/config dosyasi; tracked oldugu icin repoda gorunuyor.
- `assets/`: 341 PNG sprite/icon dosyasi.
- `docs/`: 24 urun, mimari, QA ve release dokumani.
- `public/`: 7 preset brain/demo skill markdown dosyasi.
- `qa-release/`: 9 alpha release, QA ve installer paketleme dosyasi.
- `src/`: 80 frontend/domain/test dosyasi.
- `src-tauri/`: 65 Tauri/Rust/config/icon dosyasi.
- Root config dosyalari: `package.json`, `package-lock.json`, TypeScript, Vite, Vitest ve HTML girisi.

### Root Dosyalari

- `.gitignore`: build, dependency, local tool artifact ve medya ciktilarini ignore eder.
- `index.html`: Vite uygulamasinin HTML girisi.
- `package.json`: npm scriptleri, React/Tauri/xterm runtime dependency'leri ve test/build toolchain'i.
- `package-lock.json`: npm dependency lock dosyasi.
- `README.md`: urun tanimi, kurulum ve kullanim dokumani.
- `tsconfig.json`: frontend TypeScript derleme ayarlari.
- `tsconfig.node.json`: Node/Vite tarafindaki TypeScript ayarlari.
- `vite.config.ts`: Vite dev/build konfiguru.
- `vitest.config.ts`: Vitest unit test konfiguru.

### Agent Talimatlari

- `.agents/claude/CLAUDE.md`: Claude agent davranis talimatlari.
- `.agents/codex/CODEX.md`: Codex agent davranis talimatlari.
- `.agents/gemini/GEMINI.md`: Gemini agent davranis talimatlari.
- `.agents/ollama/OLLAMA.md`: Ollama/local model agent talimatlari.

### Assets

- `assets/app-icon.png`: uygulama ikon kaynagi.
- `assets/female/**` ve `assets/male/**`: dino karakter sprite setleri. Karakterler `cole`, `doux`, `kira`, `kuro`, `loki`, `mono`, `mort`, `nico`, `olaf`, `sena`, `tard`, `vita` gibi varyantlara ayrilir.
- Her karakter altinda `base`, `egg`, `ghost` durumlari bulunur. `base` durumlari agent aktivitesini gorsellestiren animasyonlari (`idle`, `move`, `scan`, `bite`, `dash`, `dead`, `hurt`, `jump`, `kick`, `avoid`) tasir. `egg` ve `ghost` dosyalari lifecycle gecislerinde kullanilir.

### Docs

- `docs/ARCHITECTURE_RULES.md`: mimari karar ve sinirlar.
- `docs/AUTOMATED_QA.md`: otomatik QA yaklasimi.
- `docs/CLEAN_MACHINE_QA.md`: temiz makinede test akisi.
- `docs/CMDINO_CURRENT_STATE_REPORT_TR.md`: bu guncel durum raporu.
- `docs/CMDINO_FEATURE_BEHAVIOR_CONTRACT.md`: ozellik davranis sozlesmesi.
- `docs/CMDINO_GENIS_KAPSAMLI_DURUM_RAPORU_TR.md`: onceki genis durum raporu.
- `docs/CMDINO_MASTER_BRIEF.md`: urun master brief'i.
- `docs/CMDINO_PRODUCT_TODO.md`: urun todo listesi.
- `docs/CMDINO_SCOPE_RECOVERY_SPEC.md`: V2 kapsam toparlama spesifikasyonu.
- `docs/CMDINO_V2_IMPLEMENTATION_PLAN.md`: sprint bazli V2 uygulama plani.
- `docs/DINO_ASSET_INTEGRATION_SPEC.md`: sprite asset entegrasyon kurallari.
- `docs/DOGFOOD_WORKFLOW_QA.md`: dogfood workflow QA notlari.
- `docs/KNOWN_ISSUES.md`: bilinen sorunlar.
- `docs/PRE_PUSH_VALIDATION_CHECKLIST.md`: push oncesi kontrol listesi.
- `docs/PRODUCT_TRUST_QA.md`: urun guven QA kriterleri.
- `docs/QA_REGRESSION.md`: regresyon test notlari.
- `docs/RELEASE_CHECKLIST.md`: release checklist.
- `docs/V1_ALPHA_PACKAGING_CHECKLIST.md`: V1 alpha paketleme checklist'i.
- `docs/media/hero-demo.png`: README/marketing gorseli.
- `docs/screenshots/**`: dokumantasyon ve QA ekran goruntuleri.

### Public

- `public/demo-skills/*.md`: demo workspace icin ornek skill/prompts.
- `public/preset-brains/*.md`: Claude, Codex, Gemini ve Ollama icin hazir agent brain dosyalari.

### QA Release

- `qa-release/README.md`: alpha QA kit aciklamasi.
- `qa-release/QUICKSTART.md`: tester hizli baslangic.
- `qa-release/RELEASE_NOTES_ALPHA.md`: alpha surum notlari.
- `qa-release/KNOWN_ISSUES_ALPHA.md`: alpha bilinen sorunlar.
- `qa-release/CLEAN_MACHINE_QA.md`: temiz makine QA akisi.
- `qa-release/CLOSED_ALPHA_TESTER_TASKS.md`: kapali alpha tester gorevleri.
- `qa-release/BUG_REPORT_TEMPLATE.md`: bug raporu sablonu.
- `qa-release/PACKAGE_QA_KIT.ps1`: QA paketleme script'i.
- `qa-release/installers/.gitkeep`: installer klasorunu korur.
- `qa-release/installers/CMDino_0.1.0_x64-setup.exe`: Windows NSIS installer.
- `qa-release/installers/CMDino_0.1.0_x64_en-US.msi`: Windows MSI installer.

### Tauri / Rust

- `src-tauri/Cargo.toml`: Rust crate ve Tauri dependency tanimlari.
- `src-tauri/Cargo.lock`: Rust dependency lock dosyasi.
- `src-tauri/build.rs`: Tauri build hook'u.
- `src-tauri/tauri.conf.json`: uygulama adi, pencere, bundle, icon ve resource ayarlari.
- `src-tauri/capabilities/default.json`: Tauri izin/capability tanimlari.
- `src-tauri/src/main.rs`: native entry point.
- `src-tauri/src/lib.rs`: Tauri builder ve invoke handler kayit merkezi.
- `src-tauri/src/terminal.rs`: terminal process spawn/write/resize/kill mantigi.
- `src-tauri/src/workspace.rs`: workspace dosyalarini kaydetme/yukleme/silme.
- `src-tauri/src/files.rs`: dosya preview ve preset brain okuma.
- `src-tauri/src/readiness.rs`: provider komut/dizin kontrolleri ve health scan.
- `src-tauri/src/memory_briefs.rs`: memory brief, prompt ve output file yazma/listeleme.
- `src-tauri/src/context_library.rs`: project context manifest/dosya okuma-yazma.
- `src-tauri/src/session_logs.rs`: session log modeli/yardimcilari.
- `src-tauri/icons/**`: desktop, Android ve iOS icin Tauri icon setleri.

### Frontend Giris ve Config

- `src/main.tsx`: React uygulamasini DOM'a mount eder.
- `src/App.tsx`: tum ana state, workflow ve UI yuzeylerini birlestiren uygulama kabugu.
- `src/index.css`: global tema, layout, component, terminal ve workflow stilleri.
- `src/config/*.ts`: agent presetleri, demo workspace, dino manifest/options/state map, preset brains, tema tokenlari ve workspace template verileri.

### Components

- `AgentCreationModal.tsx`: yeni agent olusturma formu.
- `AgentDock.tsx`: agent durumlarini kompakt dock olarak gosterir.
- `AgentEditModal.tsx`: mevcut agent duzenleme formu.
- `AgentTeamSelector.tsx`: workflow icin agent takimi secimi.
- `AppSidebar.tsx`: sol navigasyon, saglik ve intervention badge'leri.
- `ArtifactReaderModal.tsx`: artifact okuma modal'i.
- `AttachmentPanel.tsx`: output/context/dosya attachment secimi.
- `ConfirmDialog.tsx`: genel onay dialog'u.
- `ContextLibraryModal.tsx`: project context manifest ve context dosyalarini yonetir.
- `ContinuationPanel.tsx`: son session'dan devam etme yuzeyi.
- `EmptyStateMascot.tsx`: bos durum gorsel bileseni.
- `EmptyWorkspaceState.tsx`: agent yokken ilk aksiyon yuzeyi.
- `HandoffModal.tsx`: agentlar arasi handoff kurma modal'i.
- `HealthPanel.tsx`: provider health sonuclarini gosterir.
- `HistoryDrawer.tsx`: session/activity log drawer'i.
- `LogsPanel.tsx`: terminal/session log gorunumu.
- `MainHeader.tsx`: ana baslik ve ust aksiyonlar.
- `MainTaskChat.tsx`: kullanici gorevi, sistem status ve intervention mesajlarini gosterir.
- `MarkdownArtifactReader.tsx`: markdown artifact okuma bileseni.
- `MarkdownArtifactReader.tsx.tmp`: gecici/alternatif markdown reader dosyasi.
- `OutputLibraryDrawer.tsx`: uretilen output dosyalarini listeler, acar ve siler.
- `ProjectOpenScreen.tsx`: proje secme/acma ilk ekran akisi.
- `RuntimeErrorCard.tsx`: runtime hata kartlari ve aksiyonlari.
- `SavedWorkspaceBrowser.tsx`: kaydedilmis CMDino workspace dosyalarini listeler.
- `SettingsPanel.tsx`: tema, terminal ve health ayarlari.
- `TemplatePickerModal.tsx`: hazir workspace template secimi.
- `TerminalGrid.tsx`: terminal pane grid layout'u.
- `TerminalPane.tsx`: xterm terminali, lifecycle state'i ve agent controls.
- `TerminalTabs.tsx`: agent terminal tab listesi.
- `WelcomeHealthSummary.tsx`: ilk acilis saglik ozeti.
- `WelcomeModal.tsx`: onboarding modal'i.
- `WorkflowPanel.tsx`: agent workflow haritasi ve node/edge gorseli.
- `WorkflowRunHistoryPanel.tsx`: tamamlanan/yarim kalan workflow run listesi.
- `WorkflowRunTimeline.tsx`: workflow step timeline'i.
- `WorkspaceToolbar.tsx`: gorunum, export ve workspace toolbar aksiyonlari.

### Dino

- `src/dino/DinoLane.tsx`: dino lifecycle/animasyon seridini kontrol eder.
- `src/dino/SpriteAnimator.tsx`: sprite frame animasyonu render eder.
- `src/dino/assetLoader.ts`: sprite asset preload/cache yardimcilari.

### Domain

- `agentCwd.ts`: agent calisma dizini cozumleme ve health sinifi.
- `agentKind.ts`: agent provider turu cikarimi.
- `agentTargetSuggestion.ts`: workflow step icin hedef agent onerisi.
- `agentTeam.ts`: agent takimlari ve workspace/workflow'a donusum.
- `appSettings.ts`: localStorage destekli uygulama ayarlari.
- `attachments.ts`: attachment kaynak/kind siniflandirma ve ownership map.
- `buildPublicExport.ts`: build-in-public export kit markdown taslaklari.
- `cmdinoChat.ts`: chat mesaj tipleri ve factory fonksiyonlari.
- `contextLibrary.ts`: project context manifest modeli ve secim mantigi.
- `handoffProtocol.ts`: handoff/result marker parse ve prompt uretimi.
- `health.ts`: provider health snapshot tipleri.
- `intervention.ts`: intervention modeli, aksiyonlari ve factory'leri.
- `lastSession.ts`: son session kaydetme/yukleme.
- `memoryBrief.ts`: agent memory brief uretimi.
- `orchestration.ts`: terminal orchestration tipleri.
- `outputLibrary.ts`: output dosya siniflandirma/listeleme mantigi.
- `presetBrain.ts`: preset brain tipi.
- `projectDetection.ts`: proje turu/package manager tespiti.
- `projectWorkspace.ts`: proje workspace modeli.
- `readiness.ts`: readiness failure tipleri.
- `runtimeError.ts`: runtime hata modeli.
- `sessionLog.ts`: activity/session log modeli.
- `terminalAgent.ts`: terminal agent modeli.
- `transcriptExport.ts`: transcript export dosyasi uretimi.
- `viewMode.ts`: terminal gorunum modu tipi.
- `workflow.ts`: workflow link/step tipleri.
- `workflowArtifacts.ts`: workflow step/final artifact uretimi.
- `workflowPromptSend.ts`: prompt hedefleri, cwd mismatch ve submit strategy.
- `workflowResultCapture.ts`: CMDINO_RESULT yakalama ve normalize etme.
- `workflowRun.ts`: workflow run state machine tipleri.
- `workflowRunHistory.ts`: run history persistence ve resume mantigi.
- `workflowSummary.ts`: final workflow summary uretimi.
- `*.test.ts`: yukaridaki domain davranislarini unit testlerle kilitler.

### Orchestration

- `src/orchestration/useWorkflowOrchestrator.ts`: checkpoint mode workflow runtime hook'u.
- `src/orchestration/cmdinoResultParser.ts`: `CMDINO_RESULT` bloklarini parse eder.
- `src/orchestration/stepPromptBuilder.ts`: step bazli agent promptlari uretir.
- `*.test.ts`: parser ve prompt builder davranislarini dogrular.

### State Hooks

- `useAgentTeamSelection.ts`: secili agent team state'i.
- `useAppSettings.ts`: uygulama ayarlari state'i.
- `useCmdinoChat.ts`: chat mesaj state'i.
- `useInterventions.ts`: intervention lifecycle state'i.
- `useProjectWorkspace.ts`: current/recent project state'i.
- `useProviderHealth.ts`: provider health state'i.
- `useSessionLog.ts`: session log state'i.
- `useTerminalAgents.ts`: agent listesi, workflow links ve terminal state'i.
- `useWorkflowRunHistory.ts`: workflow run history persistence.

### Bridges / Hooks / Terminal

- `src/context/contextLibraryBridge.ts`: frontend ile Tauri context library komutlari arasindaki bridge.
- `src/health/healthBridge.ts`: provider health scan bridge'i.
- `src/hooks/useAttachmentDrop.ts`: drag/drop attachment akisi.
- `src/memory/memoryBriefBridge.ts`: memory brief/output/prompt file bridge'i.
- `src/readiness/readinessBridge.ts`: command/directory readiness bridge'i.
- `src/workspace/workspaceBridge.ts`: CMDino workspace dosya bridge'i.
- `src/workspace/projectWorkspaceBridge.ts`: project folder picker bridge'i.
- `src/terminal/agentActivity.ts`: agent aktivite durum yardimcilari.
- `src/terminal/agentStateAdapters.ts`: terminal state adapter'lari.
- `src/terminal/dinoStateMachine.ts`: terminal lifecycle -> dino state eslemesi.
- `src/terminal/runtimeErrorClassifier.ts`: runtime hata siniflandirma.
- `src/terminal/stdoutVibeParser.ts`: stdout'tan durum sinyali cikarimi.
- `src/terminal/terminalBridge.ts`: frontend terminal invoke bridge'i.
- `src/terminal/terminalIntelligence.ts`: terminal output zekasi/heuristic mantigi.
- `src/terminal/useTerminalProcess.ts`: xterm ve Tauri terminal process hook'u.

### Test

- `test/setup.ts`: Vitest setup.
- `test/specs/smoke.e2e.ts`: silinmis durumda; eski e2e smoke test.
- `test/wdio.conf.ts`: silinmis durumda; eski WebdriverIO Tauri e2e konfiguru.

## Degisiklik Ozeti

Mevcut calisma agacinda one cikan degisiklikler:

- `App.tsx` ve `index.css` buyuk oranda V2 shell, chat-first workflow ve yeni layout davranisi icin genisletildi.
- `src/domain/`, `src/orchestration/`, `src/state/` altinda V2 workflow, context ve intervention domain dosyalari eklendi.
- `src-tauri/src/context_library.rs` eklendi ve `lib.rs` icinde Tauri command olarak baglandi.
- E2E WebdriverIO dosyalari silindi, ancak npm script henuz temizlenmedi.
- Alpha installer dosyalari `qa-release/installers/` altina eklendi.

## Onerilen Sonraki Isler

1. `package.json` icindeki `test:e2e:tauri` ve `qa:desktop` script'leri silinen WDIO dosyalariyla uyumlu hale getirilmeli.
2. `MarkdownArtifactReader.tsx.tmp` dosyasinin kalici mi gecici mi oldugu netlestirilmeli.
3. `readiness.rs` icindeki `duration_ms` uyarisi ya kullanilarak health raporuna eklenmeli ya da modelden kaldirilmali.
4. Bundle boyutu icin Vite warning'i takip edilmeli; gerekirse lazy import/manual chunk planlanmali.
