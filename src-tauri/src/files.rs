use std::io::Read;

const PREVIEW_LIMIT: usize = 262_144; // 256 KiB

#[derive(serde::Serialize)]
pub struct ReadFileResult {
    content:   String,
    truncated: bool,
}

#[tauri::command]
pub fn read_file_preview(path: String) -> Result<ReadFileResult, String> {
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
