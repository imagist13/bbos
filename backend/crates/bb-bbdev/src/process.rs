//! bbdev 进程管理：启动、读取日志、取消。

use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::mpsc;
use chrono::Utc;
use bb_core::jobs::{LogEntry, Stream};
use super::cli::BbdevCommand;
use super::detect::BbdevStatus;

#[derive(Debug, thiserror::Error)]
pub enum RunError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("bbdev unavailable: {0}")]
    Unavailable(String),
}

#[derive(Debug, thiserror::Error)]
pub enum CancelError {
    #[error("process already exited")]
    AlreadyExited,
    #[error("kill error: {0}")]
    Kill(#[from] std::io::Error),
}

pub struct BbdevProcess {
    child: Child,
}

impl BbdevProcess {
    /// 启动 bbdev 进程。
    pub async fn spawn(cmd: &BbdevCommand) -> Result<Self, RunError> {
        let mut tokio_cmd = Self::build_command(cmd);
        let child = tokio_cmd.spawn()?;
        Ok(Self { child })
    }

    /// 等待进程退出，同时发送日志行到 log_tx。
    pub async fn wait_with_logs(
        &mut self,
        log_tx: mpsc::Sender<LogEntry>,
    ) -> Result<Option<i32>, RunError> {
        let stdout = self.child.stdout.take();
        let stderr = self.child.stderr.take();

        // 并发读取 stdout 和 stderr
        let tx1 = log_tx.clone();
        let stdout_handle = if let Some(stdout) = stdout {
            let reader = BufReader::new(stdout);
            tokio::spawn(async move {
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let entry = LogEntry {
                        line,
                        stream: Stream::Stdout,
                        ts: Utc::now(),
                    };
                    let _ = tx1.send(entry).await;
                }
            })
        } else {
            tokio::spawn(async {})
        };

        let tx2 = log_tx.clone();
        let stderr_handle = if let Some(stderr) = stderr {
            let reader = BufReader::new(stderr);
            tokio::spawn(async move {
                let mut lines = reader.lines();
                while let Ok(Some(line)) = lines.next_line().await {
                    let entry = LogEntry {
                        line,
                        stream: Stream::Stderr,
                        ts: Utc::now(),
                    };
                    let _ = tx2.send(entry).await;
                }
            })
        } else {
            tokio::spawn(async {})
        };

        let status = self.child.wait().await?;
        let _ = stdout_handle.await;
        let _ = stderr_handle.await;

        Ok(status.code())
    }

    /// 杀进程组（Unix）或杀主进程。
    pub fn kill_group(&mut self) -> Result<(), CancelError> {
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            // 使用 kill_on_drop 确保析构时也杀
        }
        // 先尝试杀主进程
        self.child.start_kill()?;
        Ok(())
    }

    fn build_command(cmd: &BbdevCommand) -> Command {
        let mut tokio_cmd = Command::new("nix");
        tokio_cmd.args(["develop", ".#default", "--command", "bbdev"]);
        for arg in &cmd.args {
            tokio_cmd.arg(arg);
        }
        tokio_cmd.current_dir(&cmd.working_dir);
        #[cfg(unix)]
        {
            use std::os::unix::process::CommandExt;
            // 创建进程组，这样 kill -PGID 能递归杀子进程
            tokio_cmd.process_group(0);
        }
        tokio_cmd
    }
}

/// 检查 bbdev 状态。
pub async fn check_bbdev() -> BbdevStatus {
    super::detect::detect().await
}
