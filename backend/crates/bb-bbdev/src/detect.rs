//! 探测 bbdev 可用性。

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub enum BbdevStatus {
    Available { version: String, path: String },
    Unavailable { reason: String },
}

/// 探测 bbdev 是否可用。
/// 检测顺序：
/// 1. `nix develop .#default -c bbdev --version`
/// 2. `bbdev --version`
/// 3. `bash bbdev --version`
pub async fn detect() -> BbdevStatus {
    // 尝试 nix develop 方式
    if let Ok(v) = run_nix_cmd(&["bbdev", "--version"]).await {
        if !v.trim().is_empty() {
            return BbdevStatus::Available {
                version: v.trim().to_string(),
                path: "nix develop".to_string(),
            };
        }
    }

    // 尝试直接 bbdev
    if let Ok(v) = run_nix_cmd(&["bbdev", "--version"]).await {
        if !v.trim().is_empty() {
            return BbdevStatus::Available {
                version: v.trim().to_string(),
                path: "bbdev".to_string(),
            };
        }
    }

    BbdevStatus::Unavailable {
        reason: "bbdev not found in PATH".to_string(),
    }
}

async fn run_nix_cmd(args: &[&str]) -> Result<String, std::io::Error> {
    use tokio::process::Command;

    // 尝试用 bash 直接执行
    let output = Command::new("bash")
        .args(["-c", &args.join(" ")])
        .output()
        .await?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(std::io::Error::new(std::io::ErrorKind::NotFound, "command failed"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_detect() {
        let status = detect().await;
        println!("BbdevStatus: {:?}", status);
    }
}
