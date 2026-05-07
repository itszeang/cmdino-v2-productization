use std::io::{Read, Write};
use std::net::TcpStream;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::{Duration, Instant};

/// Returns true when the path is a directory (or empty — meaning default CWD).
#[tauri::command]
pub fn check_directory_exists(path: String) -> Result<bool, String> {
    let p = path.trim();
    if p.is_empty() || p == "." {
        return Ok(true);
    }
    Ok(PathBuf::from(p).is_dir())
}

/// Returns true when `command` (executable name, no args) is findable on PATH.
/// Never executes the command.
#[tauri::command]
pub fn check_command_available(command: String) -> Result<bool, String> {
    let cmd = command.trim();
    if cmd.is_empty() {
        return Ok(false);
    }

    // Absolute path — just check if the file exists.
    let as_path = PathBuf::from(cmd);
    if as_path.is_absolute() {
        return Ok(as_path.is_file());
    }

    let path_var = match std::env::var("PATH") {
        Ok(v)  => v,
        Err(_) => return Ok(false),
    };

    #[cfg(windows)]
    let sep = ";";
    #[cfg(not(windows))]
    let sep = ":";

    // Extensions to probe on Windows.
    #[cfg(windows)]
    let extensions: Vec<String> = {
        let mut exts: Vec<String> = std::env::var("PATHEXT")
            .unwrap_or_else(|_| ".EXE;.CMD;.BAT;.COM".to_string())
            .split(';')
            .map(|e| e.to_uppercase())
            .collect();
        // Ensure .EXE is always tried first.
        if !exts.iter().any(|e| e == ".EXE") {
            exts.insert(0, ".EXE".to_string());
        }
        exts
    };

    for dir in path_var.split(sep) {
        let dir_path = PathBuf::from(dir.trim());

        // Check exact name (handles scripts that may already have extension).
        if dir_path.join(cmd).is_file() {
            return Ok(true);
        }

        // On Windows also probe PATHEXT extensions.
        #[cfg(windows)]
        for ext in &extensions {
            let candidate = dir_path.join(format!("{}{}", cmd, ext));
            if candidate.is_file() {
                return Ok(true);
            }
            // Case-insensitive probe: also try lowercase extension.
            let candidate_lc = dir_path.join(format!("{}{}", cmd, ext.to_lowercase()));
            if candidate_lc.is_file() {
                return Ok(true);
            }
        }
    }

    Ok(false)
}

// ── Health scan ───────────────────────────────────────────────────────────────

#[derive(serde::Serialize, Clone, Default)]
pub struct HealthDetails {
    pub auth_checked:    bool,
    pub service_checked: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub raw_exit_code:   Option<i32>,
    pub timed_out:       bool,
}

#[derive(serde::Serialize, Clone)]
pub struct ProviderHealthDto {
    pub id:          String,
    pub status:      String,
    pub confidence:  String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version:     Option<String>,
    pub explanation: String,
    pub fix_hint:    String,
    pub duration_ms: u64,
    pub details:     HealthDetails,
}

struct ProbeOutput {
    stdout:      String,
    stderr:      String,
    exit_code:   i32,
    timed_out:   bool,
    duration_ms: u64,
}

fn cmd_on_path(cmd: &str) -> bool {
    check_command_available(cmd.to_string()).unwrap_or(false)
}

fn run_probe(exe: &str, args: &[&str], timeout_ms: u64) -> ProbeOutput {
    let t0 = Instant::now();
    let exe_s = exe.to_string();
    let args_s: Vec<String> = args.iter().map(|s| s.to_string()).collect();
    let (tx, rx) = mpsc::channel::<std::io::Result<std::process::Output>>();
    std::thread::spawn(move || {
        let mut cmd = std::process::Command::new(&exe_s);
        cmd.args(&args_s);
        cmd.stdout(std::process::Stdio::piped());
        cmd.stderr(std::process::Stdio::piped());
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }
        let _ = tx.send(cmd.output());
    });
    match rx.recv_timeout(Duration::from_millis(timeout_ms)) {
        Ok(Ok(out)) => ProbeOutput {
            stdout:      String::from_utf8_lossy(&out.stdout).trim().to_string(),
            stderr:      String::from_utf8_lossy(&out.stderr).trim().to_string(),
            exit_code:   out.status.code().unwrap_or(-1),
            timed_out:   false,
            duration_ms: t0.elapsed().as_millis() as u64,
        },
        Ok(Err(_)) => ProbeOutput {
            stdout: String::new(), stderr: "process launch failed".to_string(),
            exit_code: -1, timed_out: false,
            duration_ms: t0.elapsed().as_millis() as u64,
        },
        Err(_) => ProbeOutput {
            stdout: String::new(), stderr: "timed out".to_string(),
            exit_code: -1, timed_out: true, duration_ms: timeout_ms,
        },
    }
}

fn check_ollama_http(timeout_ms: u64) -> bool {
    let addr: std::net::SocketAddr = match "127.0.0.1:11434".parse() {
        Ok(a) => a,
        Err(_) => return false,
    };
    match TcpStream::connect_timeout(&addr, Duration::from_millis(timeout_ms)) {
        Ok(mut stream) => {
            let _ = stream.set_read_timeout(Some(Duration::from_millis(timeout_ms)));
            let _ = stream.write_all(b"GET /api/version HTTP/1.0\r\nHost: 127.0.0.1:11434\r\nConnection: close\r\n\r\n");
            let mut buf = [0u8; 64];
            match stream.read(&mut buf) {
                Ok(n) if n >= 4 => std::str::from_utf8(&buf[..n]).unwrap_or("").starts_with("HTTP"),
                _ => false,
            }
        }
        Err(_) => false,
    }
}

fn extract_version(s: &str) -> Option<String> {
    for token in s.split_whitespace() {
        let t = token.trim_matches(|c: char| c == ',' || c == ';' || c == '"' || c == '\'');
        let stripped = t.trim_start_matches('v').trim_start_matches('V');
        let parts: Vec<_> = stripped.split('.').collect();
        if parts.len() >= 2
            && parts[0].parse::<u32>().is_ok()
            && parts[1].chars().next().map(|c| c.is_ascii_digit()).unwrap_or(false)
        {
            return Some(t.to_string());
        }
    }
    None
}

fn probe_claude() -> ProviderHealthDto {
    let t0 = Instant::now();
    if !cmd_on_path("claude") {
        return ProviderHealthDto {
            id: "claude".into(), status: "missing".into(), confidence: "high".into(), version: None,
            explanation: "Claude CLI not found on PATH.".into(),
            fix_hint: "Install Claude Code from claude.ai, then run `claude login`.".into(),
            duration_ms: t0.elapsed().as_millis() as u64, details: HealthDetails::default(),
        };
    }
    let ver = run_probe("claude", &["--version"], 1500);
    let version = extract_version(&ver.stdout).or_else(|| extract_version(&ver.stderr));
    let auth = run_probe("claude", &["auth", "status"], 2500);
    if auth.timed_out {
        return ProviderHealthDto {
            id: "claude".into(), status: "installed".into(), confidence: "medium".into(), version,
            explanation: "Claude CLI is installed. Auth status check timed out — authentication cannot be confirmed.".into(),
            fix_hint: "Run `claude auth status` to verify. Run `claude login` if not authenticated.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, timed_out: true, ..Default::default() },
        };
    }
    if auth.exit_code == 0 {
        ProviderHealthDto {
            id: "claude".into(), status: "ready".into(), confidence: "high".into(), version,
            explanation: "Claude CLI found and authenticated.".into(), fix_hint: String::new(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, raw_exit_code: Some(0), ..Default::default() },
        }
    } else {
        ProviderHealthDto {
            id: "claude".into(), status: "auth_required".into(), confidence: "high".into(), version,
            explanation: "Claude CLI installed but not authenticated.".into(),
            fix_hint: "Run `claude login` to authenticate.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, raw_exit_code: Some(auth.exit_code), ..Default::default() },
        }
    }
}

fn probe_codex() -> ProviderHealthDto {
    let t0 = Instant::now();
    if !cmd_on_path("codex") {
        return ProviderHealthDto {
            id: "codex".into(), status: "missing".into(), confidence: "high".into(), version: None,
            explanation: "Codex CLI not found on PATH.".into(),
            fix_hint: "Install Codex CLI, then run `codex login`.".into(),
            duration_ms: t0.elapsed().as_millis() as u64, details: HealthDetails::default(),
        };
    }
    let ver = run_probe("codex", &["--version"], 1500);
    let version = extract_version(&ver.stdout).or_else(|| extract_version(&ver.stderr));
    let auth = run_probe("codex", &["login", "status"], 2500);
    if auth.timed_out {
        return ProviderHealthDto {
            id: "codex".into(), status: "installed".into(), confidence: "medium".into(), version,
            explanation: "Codex CLI is installed. Auth status check timed out — authentication cannot be confirmed.".into(),
            fix_hint: "Run `codex login status` to check. Run `codex login` if not authenticated.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, timed_out: true, ..Default::default() },
        };
    }
    if auth.exit_code == 0 {
        return ProviderHealthDto {
            id: "codex".into(), status: "ready".into(), confidence: "high".into(), version,
            explanation: "Codex CLI found and credentials exist.".into(), fix_hint: String::new(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, raw_exit_code: Some(0), ..Default::default() },
        };
    }
    let combined = format!("{} {}", auth.stdout, auth.stderr).to_lowercase();
    let auth_hint = combined.contains("login") || combined.contains("auth") || combined.contains("credential");
    if auth_hint {
        ProviderHealthDto {
            id: "codex".into(), status: "auth_required".into(), confidence: "medium".into(), version,
            explanation: "Codex CLI installed but credentials not found.".into(),
            fix_hint: "Run `codex login` to authenticate.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, raw_exit_code: Some(auth.exit_code), ..Default::default() },
        }
    } else {
        ProviderHealthDto {
            id: "codex".into(), status: "installed".into(), confidence: "low".into(), version,
            explanation: "Codex CLI is installed. Auth status could not be confirmed automatically.".into(),
            fix_hint: "Start Codex once or run `codex login status` to confirm authentication.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { auth_checked: true, raw_exit_code: Some(auth.exit_code), ..Default::default() },
        }
    }
}

fn probe_gemini() -> ProviderHealthDto {
    let t0 = Instant::now();
    if !cmd_on_path("gemini") {
        return ProviderHealthDto {
            id: "gemini".into(), status: "missing".into(), confidence: "high".into(), version: None,
            explanation: "Gemini CLI not found on PATH.".into(),
            fix_hint: "Install Gemini CLI and authenticate. See Gemini CLI docs.".into(),
            duration_ms: t0.elapsed().as_millis() as u64, details: HealthDetails::default(),
        };
    }
    let ver = run_probe("gemini", &["--version"], 1500);
    let version = extract_version(&ver.stdout).or_else(|| extract_version(&ver.stderr));
    ProviderHealthDto {
        id: "gemini".into(), status: "installed".into(), confidence: "low".into(), version,
        explanation: "Gemini CLI is installed. Authentication cannot be safely verified without an interactive call.".into(),
        fix_hint: "CMDino cannot verify Gemini auth automatically. Watch for login prompts when starting.".into(),
        duration_ms: t0.elapsed().as_millis() as u64,
        details: HealthDetails { auth_checked: false, ..Default::default() },
    }
}

fn probe_ollama() -> ProviderHealthDto {
    let t0 = Instant::now();
    if !cmd_on_path("ollama") {
        return ProviderHealthDto {
            id: "ollama".into(), status: "missing".into(), confidence: "high".into(), version: None,
            explanation: "Ollama CLI not found on PATH.".into(),
            fix_hint: "Install Ollama from ollama.com and start with `ollama serve`.".into(),
            duration_ms: t0.elapsed().as_millis() as u64, details: HealthDetails::default(),
        };
    }
    let ver = run_probe("ollama", &["--version"], 1500);
    let version = extract_version(&ver.stdout).or_else(|| extract_version(&ver.stderr));
    let api_ok = check_ollama_http(750);
    if api_ok {
        ProviderHealthDto {
            id: "ollama".into(), status: "ready".into(), confidence: "high".into(), version,
            explanation: "Ollama CLI found and local service is responding.".into(), fix_hint: String::new(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { service_checked: true, ..Default::default() },
        }
    } else {
        ProviderHealthDto {
            id: "ollama".into(), status: "offline".into(), confidence: "high".into(), version,
            explanation: "Ollama CLI found but the local service is not running.".into(),
            fix_hint: "Start the service with `ollama serve` before running Ollama agents.".into(),
            duration_ms: t0.elapsed().as_millis() as u64,
            details: HealthDetails { service_checked: true, ..Default::default() },
        }
    }
}

fn probe_custom() -> ProviderHealthDto {
    let t0 = Instant::now();
    ProviderHealthDto {
        id: "custom".into(), status: "ready".into(), confidence: "medium".into(), version: None,
        explanation: "Custom agents can run any shell command or local CLI on your system.".into(),
        fix_hint: String::new(),
        duration_ms: t0.elapsed().as_millis() as u64,
        details: HealthDetails::default(),
    }
}

#[tauri::command]
pub fn run_health_scan() -> Result<Vec<ProviderHealthDto>, String> {
    let handles = vec![
        std::thread::spawn(probe_claude),
        std::thread::spawn(probe_codex),
        std::thread::spawn(probe_gemini),
        std::thread::spawn(probe_ollama),
        std::thread::spawn(probe_custom),
    ];
    let results = handles
        .into_iter()
        .map(|h| h.join().unwrap_or_else(|_| ProviderHealthDto {
            id: "unknown".into(), status: "error".into(), confidence: "low".into(), version: None,
            explanation: "Health probe panicked.".into(), fix_hint: String::new(),
            duration_ms: 0, details: HealthDetails::default(),
        }))
        .collect();
    Ok(results)
}
