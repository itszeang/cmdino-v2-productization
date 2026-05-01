use std::path::PathBuf;

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
