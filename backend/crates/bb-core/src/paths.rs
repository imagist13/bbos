//! 路径规范化和越界检查。

use std::path::{Path, PathBuf};

/// 拼接 + canonicalize 后验证前缀在 root 内。
pub fn canonicalize_and_authorize(
    root: &Path,
    user_path: &Path,
) -> Result<PathBuf, String> {
    let root = root.canonicalize().map_err(|e| format!("invalid root: {}", e))?;

    let joined = if user_path.is_absolute() {
        user_path.to_path_buf()
    } else {
        root.join(user_path)
    };

    let canonical = joined.canonicalize().map_err(|e| format!("path error: {}", e))?;

    // 验证 canonical 结果的前缀是 root
    let canonical_str = canonical.to_string_lossy();
    let root_str = root.to_string_lossy();

    if !canonical_str.starts_with(&*root_str) {
        return Err(format!(
            "path '{}' is outside workspace '{}'",
            canonical_str, root_str
        ));
    }

    Ok(canonical)
}

/// 列出 root 下所有包含 chip.toml 的子目录。
pub fn discover_chips(root: &Path) -> Vec<PathBuf> {
    let mut chips = Vec::new();

    if let Ok(entries) = std::fs::read_dir(root) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() && path.join("chip.toml").exists() {
                chips.push(path);
            }
        }
    }

    chips.sort_by_key(|p| p.to_string_lossy().to_lowercase());
    chips
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_discover_chips() {
        let dir = tempfile::tempdir().unwrap();
        let root = dir.path();

        // 创建一个有 chip.toml 的子目录
        fs::create_dir(root.join("chip-a")).unwrap();
        fs::write(root.join("chip-a").join("chip.toml"), "").unwrap();

        fs::create_dir(root.join("chip-b")).unwrap();
        fs::write(root.join("chip-b").join("chip.toml"), "").unwrap();

        // 创建一个没有 chip.toml 的子目录（不应被包含）
        fs::create_dir(root.join("no-chip")).unwrap();

        let chips = discover_chips(root);
        assert_eq!(chips.len(), 2);
    }
}
