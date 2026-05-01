use std::io::Read;
use std::path::{Path, PathBuf};
use tauri::Manager;

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

fn find_upward(start: PathBuf, marker: &str) -> Option<PathBuf> {
    let mut dir = start.as_path();
    loop {
        if dir.join(marker).is_dir() {
            return Some(dir.to_path_buf());
        }
        match dir.parent() {
            Some(p) => dir = p,
            None    => return None,
        }
    }
}

fn existing_file(path: PathBuf) -> Option<PathBuf> {
    path.is_file().then_some(path)
}

fn runtime_starts() -> Vec<PathBuf> {
    let start = std::env::current_dir()
        .or_else(|_| std::env::current_exe().map(|e| e.parent().unwrap_or(&e).to_path_buf()))
        .unwrap_or_else(|_| PathBuf::from("."));

    let exe_start = std::env::current_exe()
        .map(|e| e.parent().unwrap_or(&e).to_path_buf())
        .unwrap_or_else(|_| start.clone());

    vec![start, exe_start]
}

fn resource_candidates(resource_dir: &Path, agents_rel: &str, bundled_rel: &str) -> Vec<PathBuf> {
    let bundled_file = Path::new(bundled_rel)
        .file_name()
        .unwrap_or_default();

    vec![
        resource_dir.join(agents_rel),
        resource_dir.join(".agents").join(agents_rel.trim_start_matches(".agents/")),
        resource_dir.join(bundled_rel),
        resource_dir.join("preset-brains").join(bundled_file),
        resource_dir.join("public").join(bundled_rel),
        resource_dir.join("_up_").join(agents_rel),
        resource_dir.join("_up_").join(".agents").join(agents_rel.trim_start_matches(".agents/")),
        resource_dir.join("_up_").join(bundled_rel),
        resource_dir.join("_up_").join("preset-brains").join(bundled_file),
        resource_dir.join("_up_").join("public").join(bundled_rel),
    ]
}

/// Whitelisted preset brain IDs -> source and bundled fallback paths.
/// No path traversal is possible because only known IDs are accepted.
#[tauri::command]
pub fn read_preset_brain(app: tauri::AppHandle, id: String) -> Result<ReadFileResult, String> {
    let (agents_rel, bundled_rel): (&str, &str) = match id.as_str() {
        "claude" => (".agents/claude/CLAUDE.md", "preset-brains/claude-planner.md"),
        "codex"  => (".agents/codex/CODEX.md", "preset-brains/codex-builder.md"),
        "gemini" => (".agents/gemini/GEMINI.md", "preset-brains/gemini-reviewer.md"),
        "ollama" => (".agents/ollama/OLLAMA.md", "preset-brains/ollama-worker.md"),
        other    => return Err(format!("Preset brain is not registered: {other}")),
    };

    let mut candidates: Vec<PathBuf> = runtime_starts()
        .into_iter()
        .filter_map(|start| find_upward(start, ".agents"))
        .map(|root| root.join(agents_rel))
        .collect();

    candidates.extend(
        runtime_starts()
            .into_iter()
            .filter_map(|start| find_upward(start, "public"))
            .map(|root| root.join("public").join(bundled_rel)),
    );

    if let Ok(resource_dir) = app.path().resource_dir() {
        candidates.extend(resource_candidates(&resource_dir, agents_rel, bundled_rel));
    }

    let full = candidates
        .into_iter()
        .find_map(existing_file)
        .ok_or_else(|| {
            "Preset brain file was not found. Reinstall CMDino preset brains or remove this attachment.".to_string()
        })?;

    let file_name = full.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or(agents_rel)
        .to_string();

    read_path(full).map_err(|e| {
        if e.contains("Cannot open") || e.contains("Cannot read") {
            format!("Preset brain file could not be read: {file_name}")
        } else {
            e
        }
    })
}
