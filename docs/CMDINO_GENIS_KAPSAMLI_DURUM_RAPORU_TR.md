# CMDino Geniş Kapsamlı Durum Raporu

Tarih: 2026-05-03  
Durum: V1 Alpha / indirilebilir masaüstü alfa adayı  
Paket sürümü: `cmdino@0.1.0-alpha.1`  
Installer sürümü: `0.1.0`

## Kısa Özet

CMDino, birden fazla AI CLI ajanını aynı masaüstü çalışma alanında yönetmek için geliştirilen local-first bir Tauri uygulamasıdır. Uygulama, `claude`, `codex`, `gemini`, `ollama` veya kullanıcının verdiği herhangi bir terminal komutunu gerçek yerel PTY süreçleri olarak çalıştırır; bunları xterm.js terminal panellerinde gösterir; ajanlara rol/preset, çalışma dizini, ek bağlam dosyası, dino kimliği, lifecycle durumu, handoff/forward akışı ve workspace kalıcılığı ekler.

CMDino bir chatbot değildir, bulut tabanlı AI paneli değildir ve bir IDE'nin yerine geçmeye çalışmaz. Asıl amacı, aynı anda birden fazla AI komut satırı aracını kullanan geliştiricinin terminal karmaşasını azaltmak, ajanlar arası çıktıyı elle aktarılabilir hale getirmek ve süreç durumunu görsel olarak okunabilir kılmaktır.

## Ürün Ne Yapıyor?

CMDino, geliştiricinin yerel makinesindeki AI CLI araçlarını tek bir görsel çalışma masasında toplar. Kullanıcı her ajan için bir terminal paneli oluşturur, komutunu ve çalışma klasörünü tanımlar, isterse preset bir rol seçer ve ajanı başlatır. Her panelde gerçek terminal çalışır; çıktı canlı akar; kullanıcı terminale normal şekilde yazabilir.

Uygulamanın ayırt edici katmanı, her terminalin bir dino karakteriyle temsil edilmesidir. Dino yalnızca süs değildir; terminalin durumunu gösteren bir lifecycle göstergesidir. Ajan çalışıyor, çıktı üretiyor, hata verdi, işlem bitti, handoff yapıldı veya yoğun çalışıyor gibi durumlar dino animasyonlarına yansıtılır.

CMDino'nun bugünkü alpha hedefi, çoklu AI CLI kullanımını tek pencerede çalışır, anlaşılır ve paketlenebilir hale getirmektir. Daha sonraki hedefler workflow presetleri, daha gelişmiş log/export, daha güçlü yerel model desteği ve ücretli indie tool seviyesine çıkacak ürün olgunluğudur.

## Hedef Kullanıcı

- Birden fazla AI coding agent'ı aynı anda çalıştıran geliştiriciler.
- Claude Code, Codex CLI, Gemini CLI, Ollama veya özel shell ajanları kullanan indie hacker'lar.
- Yerel LLM ve CLI tabanlı otomasyon akışlarını yönetmek isteyen kullanıcılar.
- Terminal sekmesi ve manuel prompt-handoff karmaşasını azaltmak isteyen solo geliştiriciler.

Şimdilik hedef dışı kalan kullanıcı tipi enterprise ekipleri, cloud workspace kullanıcıları, hesap/rol/izin yönetimi gerektiren takımlar ve tamamen otonom AI pipeline isteyen kurumsal kullanıcılar.

## Temel Değer Önerisi

CMDino, dağınık multi-agent terminal kullanımını tek bir yerel masaüstü çalışma alanına taşır. Kullanıcı aynı anda bir planner, builder, reviewer ve local worker çalıştırabilir; bu ajanların çıktısını elle birbirine aktarabilir; workflow ilişkilerini görebilir; çalışma alanını yerel JSON olarak kaydedip geri yükleyebilir.

Ürünün vaadi şudur: Kullanıcının tercih ettiği CLI araçları değişmeden kalır, fakat onları yönetme şekli daha görünür, daha kontrollü ve daha az kaotik hale gelir.

## Şu Ana Kadar Yapılanlar

### 1. Ürün Omurgası Kuruldu

- CMDino adı ve ürün konumu netleştirildi.
- Local-first masaüstü uygulama modeli seçildi.
- Tauri v2 + React + TypeScript + Rust + xterm.js + `portable-pty` mimarisi kuruldu.
- Bulut backend, hesap sistemi, provider SDK entegrasyonu ve SaaS yönü bilinçli olarak kapsam dışında bırakıldı.
- Ürün dokümantasyonu hazırlandı: master brief, architecture rules, asset integration spec, packaging checklist, README, QA regression ve known issues.

### 2. Gerçek PTY Terminal Runtime'ı Eklendi

- Rust tarafında gerçek PTY spawn/write/resize/kill sistemi kuruldu.
- Frontend tarafında xterm.js terminal panelleri bağlandı.
- Terminal çıktısı Tauri eventleriyle React tarafına akıyor.
- Kullanıcı girdisi canlı PTY'ye yazılıyor.
- Terminal resize olayları backend PTY boyutuna iletiliyor.
- Kill/restart akışları eklendi.
- Duplicate spawn ve StrictMode kaynaklı tekrar başlatma riskleri azaltıldı.
- Terminal frontend-only web preview'da gerçek PTY olmadığını açıkça gösteriyor.

### 3. Dinamik Çoklu Terminal Sistemi Kuruldu

- Kullanıcı dinamik terminal/ajan ekleyebiliyor.
- Maksimum terminal sayısı 12'ye çıkarıldı.
- Grid ve focus view modları geliştirildi.
- Terminal tabları ve aktif terminal takibi eklendi.
- Panel bazlı başlatma, kaldırma, restart, copy visible output ve logs view eklendi.
- Çalışmayan/stopped ajanlar workspace içinde korunup daha sonra başlatılabiliyor.

### 4. Dino Görsel Lifecycle Katmanı Geliştirildi

- Dino asset manifest'i ve seçenek sistemi oluşturuldu.
- Sprite animator ve DinoLane runtime eklendi.
- Dino durumları terminal lifecycle ve terminal output sinyallerine bağlandı.
- Egg, hatch, idle, patrol/running, heavy processing, scan/review, success, handoff, error ve dead benzeri durumlar UI'da karşılık buluyor.
- Dino scale ve animation speed ayarları eklendi.
- Dino görselleri packaged build içinde kullanılacak asset yapısına dahil edildi.

### 5. Agent Preset Sistemi Eklendi

Hazır ajan profilleri:

- Claude Planner: varsayılan komut `claude`, planlama rolü.
- Codex Builder: varsayılan komut `codex`, implementasyon rolü.
- Gemini Reviewer: varsayılan komut `gemini`, review/risks/test rolü.
- Ollama Worker: varsayılan komut `ollama run llama3`, lokal/offline yardımcı rolü.
- Custom Agent: kullanıcının istediği komut.

Her preset için label, agent kind, default command, rol açıklaması, accent ve varsayılan dino kimliği tanımlandı.

### 6. Preset Brain ve Attachment Sistemi Eklendi

- `.agents/` altında role özel brain markdown dosyaları eklendi.
- `public/preset-brains/` fallback kaynakları eklendi.
- Tauri resource bundle içine `.agents/**/*` ve `public/preset-brains/**/*` dahil edildi.
- Preset brain dosyaları deploy sonrası terminale otomatik yazılmıyor; kullanıcı `SEND` düğmesine basınca terminale gönderiliyor.
- Kullanıcı `.md` ve `.txt` dosyalarını attachment olarak ekleyebiliyor.
- Attachment preview var.
- Dosya preview limiti 256 KiB.
- Attachment remove ve dedup desteği var.
- Attachment içerikleri sadece running terminale gönderiliyor.

### 7. Manual Handoff ve Auto Forward Lite Eklendi

- Running bir terminalden `HANDOFF` açılabiliyor.
- Terminal seçiminden veya son satırlardan capture alınabiliyor.
- Handoff modal içinde yakalanan metin düzenlenip başka running ajana gönderilebiliyor.
- Handoff sonrası workflow link kaydı oluşuyor.
- `FORWARD TO` ile daha hızlı forward akışı eklendi.
- Forward, seçili metni veya son temiz output bloğunu hedef terminale gönderiyor.
- Var olan workflow link varsa hedef seçiminde bu ilişki tercih ediliyor.
- Forward/handoff akışları alpha seviyesinde elle kontrollü; otonom workflow engine yok.

### 8. Workflow Görünümü Eklendi

- Workflow overlay paneli eklendi.
- Ajanlar node gibi gösteriliyor.
- Handoff/forward ilişkileri yönlü edge olarak çiziliyor.
- Edge üzerinde count/kind bilgisi gösteriliyor.
- Linkler kaldırılabiliyor.
- Demo workspace içinde Claude -> Codex -> Gemini -> Claude döngüsü tanımlı.
- Şu anda workflow paneli görselleştirme ve link yönetimi yapıyor; drag/drop workflow authoring yok.

### 9. Workspace Save/Load Sistemi Eklendi

- Workspace adı tutuluyor.
- Terminal konfigürasyonları yerel `.cmdino.json` olarak kaydedilebiliyor.
- Tauri app data altında `workspaces` klasörü kullanılıyor.
- Save/load/list için Rust Tauri komutları var.
- Workspace schema validation frontend domain katmanında var.
- Workspace içinde şu bilgiler saklanıyor:
  - workspace name
  - terminal order
  - configId
  - label
  - agent kind
  - launch command
  - cwd
  - dino id
  - attachments
  - workflow links
- Workspace içinde şunlar saklanmıyor:
  - canlı PTY süreci
  - xterm instance
  - runtime scrollback
  - secret/token
  - dino'nun geçici animasyon pozisyonu

### 10. Demo Workspace Eklendi

- `CMDino Alpha Demo` workspace config'i eklendi.
- Demo, Claude Planner, Codex Builder ve Gemini Reviewer ajanlarından oluşuyor.
- Her demo ajan preset brain attachment ile geliyor.
- Demo workflow linkleri hazır geliyor.
- First-run onboarding ve empty workspace ekranından demo yüklenebiliyor.

### 11. Readiness Guard Sistemi Eklendi

- Start/restart/start all öncesi çalışma dizini kontrolü var.
- Komutun PATH üzerinde bulunabilir olup olmadığı kontrol ediliyor.
- Komut çalıştırılmadan sadece executable availability kontrolü yapılıyor.
- Invalid cwd veya eksik executable durumunda kullanıcıya "Agent not ready" / "Restart blocked" mesajı gösteriliyor.
- Restart öncesi validation başarısızsa çalışan PTY öldürülmüyor.
- Start All yalnızca valid dormant ajanları başlatmaya çalışıyor.

### 12. Post-Deploy Agent Edit / Manage Akışı Eklendi

- Ajan deploy edildikten sonra label, command, cwd, agent kind, dino ve attachments düzenlenebiliyor.
- Düzenleme akışı mevcut ajan konfigürasyonunu güncelliyor.
- Attachment dedup ve preset/user attachment ayrımı korunuyor.
- Workflow linkleri agent configId üzerinden korunduğu için workspace reload sonrası ilişki daha stabil kalıyor.

### 13. First-Run Onboarding ve Empty Workspace Deneyimi Eklendi

- İlk açılışta Welcome modal var.
- Kullanıcı boş başlayabiliyor, demo workflow yükleyebiliyor veya ilk ajanı deploy edebiliyor.
- "Don't show this again" seçimi localStorage'a yazılıyor.
- Settings panelinden onboarding tekrar gösterilebilir.
- Ajan yokken boş workspace ekranı ürünün ana aksiyonlarını gösteriyor.

### 14. Settings Paneli Eklendi

- Dark/light theme seçimi.
- Dino animation speed ayarı.
- Dino scale ayarı.
- Terminal font scale ayarı.
- Ayarlar localStorage'a otomatik kaydediliyor.
- Reset settings ve onboarding reset akışları var.

### 15. Session History / Event Timeline Eklendi

- History drawer var.
- Event timeline localStorage içinde tutuluyor.
- Maksimum 2000 event saklanıyor.
- Event türleri arasında agent created/updated, terminal start/restart/kill/exited/error, send, handoff, forward, attachment, workspace saved/loaded bulunuyor.
- Drawer içinde filtreler var: all, commands, handoffs, errors, workspace.
- Clear history aksiyonu var.
- Önemli not: Aktif çalışan history sistemi event tabanlıdır; tam terminal transcript/scrollback kalıcılığı değildir.

### 16. QA ve Packaging Hazırlığı Yapıldı

- Windows release EXE, MSI ve NSIS bundle çıktıları üretildi.
- `npm.cmd run build` QA geçişinde başarılı raporlandı.
- `npm.cmd run tauri:build` QA geçişinde başarılı raporlandı.
- Release EXE minimal smoke test ile açılıp stabil kaldı.
- Public README güncellendi.
- Screenshot slotları dolu görünüyor: workspace main, workflow view, deploy agent, dino lifecycle.
- V1 Alpha packaging checklist hazırlandı.

## Çalışan Feature Listesi

### Native Desktop Shell

Çalışıyor. Tauri v2 ile Windows masaüstü uygulaması paketlenebiliyor. Uygulama `CMDino Alpha` başlığıyla 1280x820 varsayılan pencerede açılıyor.

### Gerçek Terminal Çalıştırma

Çalışıyor. Rust backend `portable-pty` ile PTY açıyor, frontend xterm.js ile render ediyor. Spawn, write, resize ve kill komutları mevcut.

### Çoklu Ajan Paneli

Çalışıyor. Birden fazla terminal paneli açılabiliyor. Grid/focus modları ve terminal tabs mevcut. Maksimum 12 terminal sınırı var.

### Agent Presets

Çalışıyor. Claude, Codex, Gemini, Ollama ve Custom presetleri mevcut.

### Custom Command

Çalışıyor. Kullanıcı kendi komutunu girip local shell process olarak başlatabiliyor. Başarı, komutun yerel makinede kurulu ve PATH üzerinde olmasına bağlı.

### Attachment Preview / Send

Çalışıyor. `.md` ve `.txt` dosyaları eklenebiliyor, preview alınabiliyor, running terminale gönderilebiliyor.

### Preset Brain Attachments

Çalışıyor. Brain dosyaları preset ajanlara attachment olarak ekleniyor. Kullanıcı açıkça `SEND` yapınca terminale yazılıyor.

### Handoff

Çalışıyor. Çıktı yakalanıp düzenlenerek başka running terminale gönderilebiliyor.

### Auto Forward Lite

Çalışıyor, fakat alpha sınırlı. Temiz sonuç için seçili metin veya düzgün line-oriented output daha iyi. TUI çıktıları noisy olabilir.

### Workflow Graph

Çalışıyor, fakat authoring aracı değil. Mevcut handoff/forward linklerini görselleştiriyor ve link silmeye izin veriyor.

### Workspace Save/Load

Çalışıyor. Konfigürasyon yerel JSON olarak kaydedilip geri yüklenebiliyor. Canlı process durumu restore edilmiyor.

### Demo Workspace

Çalışıyor. Üç ajanlı preset demo ve workflow linkleri hazır.

### Readiness Checks

Çalışıyor. Eksik komut veya geçersiz cwd durumunda start/restart engelleniyor.

### Session History

Çalışıyor. Event timeline olarak çalışıyor; tam terminal kayıt sistemi değil.

### Settings

Çalışıyor. Theme, animation speed, dino scale, terminal font scale ve onboarding reset localStorage ile kalıcı.

### Packaged Build

Çalışıyor olarak QA notlarına geçmiş. Windows EXE/MSI/NSIS bundle üretildi. Interactive installer reinstall akışı son QA geçişinde yeniden tam denenmedi.

## Mimari Durum

Frontend:

- React 18
- TypeScript
- Vite
- xterm.js
- Tauri JS API

Backend:

- Rust
- Tauri v2
- `portable-pty`
- Native filesystem commands
- Readiness checks

Ana katmanlar:

- `src/domain`: ürün tipleri, workspace schema, workflow modelleri.
- `src/config`: agent presets, demo workspace, dino manifest, theme tokens.
- `src/dino`: sprite loading, animation runtime, DinoLane.
- `src/terminal`: xterm hook, PTY bridge, output intelligence, dino state machine.
- `src/components`: modallar, panel, grid, terminal pane, workflow, settings, history.
- `src/state`: ajan listesi, settings, session log state hookları.
- `src/workspace`, `src/orchestration`, `src/readiness`: Tauri bridge katmanları.
- `src-tauri/src`: Rust PTY, file preview, workspace persistence, readiness commands.

Mimaride doğru ayrımlar büyük ölçüde korunmuş durumda: Dino runtime terminal spawn etmiyor; terminal lifecycle bridge üzerinden yürüyor; workspace runtime state yerine config saklıyor; Rust backend ürün UX kararlarını almıyor.

## Bilinen Sınırlamalar

- Frontend-only Vite preview gerçek PTY çalıştırmaz; gerçek test için Tauri dev/build gerekir.
- Preset ajanların çalışması `claude`, `codex`, `gemini`, `ollama` CLI araçlarının yerel kurulumuna ve authentication durumuna bağlıdır.
- Workspace load canlı session restore etmez; ajanlar stopped/dormant config olarak gelir.
- Session History event kaydıdır, tam transcript değildir.
- Auto Forward Lite TUI/ANSI-heavy çıktılarda temiz olmayabilir.
- Workflow graph drag/drop workflow builder değildir.
- Cloud sync, kullanıcı hesabı, billing, takım workspace'i yoktur.
- Installer QA şu an Windows ağırlıklı.
- Tauri bundle identifier `com.cmdino.app` macOS için ileride düzeltilmelidir.
- Vite bundle chunk warning mevcut; build'i engellemiyor.
- Lisans dosyası yok; public dağıtım öncesi netleştirilmeli.

## Yapılması Gerekenler

### Public Alpha Öncesi

- MSI ve NSIS installer akışını baştan sona manuel test et.
- Temiz Windows makinede kurulum, launch, demo load, agent deploy ve uninstall testleri yap.
- README'deki release screenshot setinin güncel UI ile birebir uyumunu doğrula.
- Preset brain kaynaklarının installed app içinde preview/send çalıştığını doğrula.
- WebView2, Rust/Tauri prerequisite ve AI CLI prerequisite açıklamalarını daha görünür yap.
- Eksik CLI durumunda onboarding veya deploy modal içinde daha net yönlendirme ekle.
- Release artifact adlarını standart hale getir.
- Git tag ve GitHub Release hazırlığı yap.
- Lisans dosyası ekle veya dağıtım koşulunu açık belirt.

### Kısa Vadeli Ürün İyileştirmeleri

- Full terminal transcript export veya per-session log export ekle.
- History drawer'a daha ayrıntılı event payload görünümü veya export ekle.
- Forward output cleaner'ı güçlendir.
- Handoff modal'da capture kaynağını daha açık göster.
- Workflow graph için daha iyi layout, link labels ve template başlangıçları ekle.
- Workspace import/export dosya seçici akışını netleştir.
- CLI readiness sonuçlarını deploy modal içinde önceden gösterecek UX ekle.
- Terminal error mesajlarını daha kullanıcı dostu hale getir.
- 8-12 panel performans testini gerçek CLI yüküyle yap.

### Orta Vadeli V1/V1.5 İyileştirmeleri

- Reusable workflow presets oluştur.
- Planner -> Builder -> Reviewer gibi hazır multi-agent çalışma akışları ekle.
- Workspace templates ve starter packs ekle.
- Agent preset/brain import-export paketi oluştur.
- Local model/Ollama tarafında model seçimi ve readiness check'i geliştir.
- Terminal intelligence adapter'larını daha fazla CLI output formatına göre güçlendir.
- Restart/kill sırasında daha ayrıntılı lifecycle audit eventleri üret.
- Screenshot ve demo capture sürecini release checklist'e bağla.

### V2 / Ücretli Ürün Yönü

- Pro settings ve workflow templates.
- Daha güçlü session arşivi ve export.
- Team/cloud değilse bile taşınabilir local packs.
- Lisans/payment gate.
- Daha iyi onboarding ve CLI installation wizard.
- Gelişmiş workflow editing.
- Marketplace yerine önce kontrollü preset pack sistemi.

## Şimdilik Bilinçli Olarak Yapılmaması Gerekenler

- Cloud backend eklemek.
- Kullanıcı hesabı/auth sistemi eklemek.
- Provider SDK'larıyla chatbot wrapper'a dönüşmek.
- AI ajanlarını yerel CLI yerine bulut API çağrısıyla çalıştırmak.
- Tam otonom workflow engine kurmak.
- Billing/team/permission sistemi eklemek.
- Büyük state yönetim kütüphanesi veya database layer eklemek.
- Ürün omurgasını yeniden yazmak.

## Riskler

En büyük teknik risk, terminal TUI çıktılarının xterm.js ve output cleaner ile her zaman temiz yakalanamamasıdır. Bu özellikle forward ve handoff kalitesini etkileyebilir.

İkinci risk, kullanıcı makinesindeki CLI kurulumlarının değişken olmasıdır. CMDino kendi başına Claude/Codex/Gemini/Ollama sağlamaz; sadece kurulu CLI süreçlerini yönetir. Bu yüzden onboarding ve readiness mesajları ürün kalitesi için kritiktir.

Üçüncü risk, alpha paketleme ve installer testinin yeterince farklı makinede denenmemiş olmasıdır. Build alınıyor, EXE smoke geçiyor, fakat public alpha için gerçek kurulum/uninstall/reinstall testleri şarttır.

## Mevcut Repo Durumu

- Ana branch üzerinde son commit: `feat: add session history event timeline`.
- Çalışma ağacında izlenmemiş iki doküman mevcut: `docs/KNOWN_ISSUES.md` ve `docs/QA_REGRESSION.md`.
- Bu rapor yeni dosya olarak eklendi.
- `node_modules`, `dist` ve `src-tauri/target` gibi generated klasörler repo içinde mevcut, fakat ürün raporu açısından kaynak gerçekliği için kullanılmadı.

## Sonuç

CMDino bugün çalışan bir V1 Alpha adayına dönüşmüş durumda. Ürünün ana omurgası tamam: gerçek local PTY terminal runtime, çoklu ajan paneli, preset ajanlar, brain attachment, manual handoff, forward, workflow visualization, local workspace save/load, readiness checks, onboarding, settings, dino lifecycle ve Windows paketleme akışı mevcut.

Public alpha öncesindeki ana iş artık yeni büyük özellik eklemek değil; installer QA, onboarding netliği, log/export beklentisi, bilinen sınırlamaların açık yazılması ve release polish sürecidir. Ürünün kimliği net: CMDino, AI CLI ajanları için local-first görsel komuta merkezi.
