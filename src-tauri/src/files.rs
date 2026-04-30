use std::io::Read;
use std::path::PathBuf;

const PREVIEW_LIMIT: usize = 262_144; // 256 KiB

#[derive(serde::Serialize)]
pub struct ReadFileResult {
    content:   String,
    truncated: bool,
}

fn read_path(path: PathBuf) -> Result<ReadFileResult, String> {
    let mut file = std::fs::File::open(&path)
        .map_err(|e| format!("Cannot open file: {e}"))?;

    let meta = file
        .metadata()
        .map_err(|e| format!("Metadata error: {e}"))?;

    let file_len = meta.len() as usize;

    if file_len > PREVIEW_LIMIT {
        let mut buf = vec![0u8; PREVIEW_LIMIT];
        file.read_exact(&mut buf)
            .map_err(|e| format!("Read error: {e}"))?;
        let content = String::from_utf8_lossy(&buf).into_owned();
        return Ok(ReadFileResult { content, truncated: true });
    }

    let mut content = String::new();
    file.read_to_string(&mut content)
        .map_err(|e| format!("Cannot read file as text: {e}"))?;

    Ok(ReadFileResult { content, truncated: false })
}

#[tauri::command]
pub fn read_file_preview(path: String) -> Result<ReadFileResult, String> {
    read_path(PathBuf::from(path))
}

/// Walk up from `start` looking for a directory that contains `.agents/`.
/// Tauri on Windows sets CWD to the exe dir (target/debug/), not the project root,
/// so we climb the tree until we find the marker.
fn find_agents_root(start: PathBuf) -> Option<PathBuf> {
    let mut dir = start.as_path();
    loop {
        if dir.join(".agents").is_dir() {
            return Some(dir.to_path_buf());
        }
        match dir.parent() {
            Some(p) => dir = p,
            None    => return None,
        }
    }
}

/// Whitelisted preset brain IDs → relative paths under .agents/.
/// No path traversal possible — only known IDs are accepted.
#[tauri::command]
pub fn read_preset_brain(id: String) -> Result<ReadFileResult, String> {
    let rel: &str = match id.as_str() {
        "claude" => ".agents/claude/CLAUDE.md",
        "codex"  => ".agents/codex/CODEX.md",
        "gemini" => ".agents/gemini/GEMINI.md",
        other    => return Err(format!("Preset brain file not found: {other}")),
    };

    // Try CWD first, then climb from the executable's location.
    let start = std::env::current_dir()
        .or_else(|_| std::env::current_exe().map(|e| e.parent().unwrap_or(&e).to_path_buf()))
        .unwrap_or_else(|_| PathBuf::from("."));

    let exe_start = std::env::current_exe()
        .map(|e| e.parent().unwrap_or(&e).to_path_buf())
        .unwrap_or_else(|_| start.clone());

    let root = find_agents_root(start.clone())
        .or_else(|| find_agents_root(exe_start))
        .ok_or_else(|| format!("Cannot find .agents directory (searched from {start:?})"))?;

    read_path(root.join(rel))
}
