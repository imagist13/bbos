//! 统一错误类型，所有 bb-core 错误都通过 thiserror 定义。

use thiserror::Error;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("workspace not found: {0}")]
    WorkspaceNotFound(String),

    #[error("chip not found: {0}")]
    ChipNotFound(String),

    #[error("design not found: {0}")]
    DesignNotFound(String),

    #[error("toml parse error: {0}")]
    TomlParse(String),

    #[error("toml serialize error: {0}")]
    TomlSerialize(String),

    #[error("io error")]
    Io(#[from] std::io::Error),

    #[error("path outside workspace: {0}")]
    PathOutsideWorkspace(String),

    #[error("job not found: {0}")]
    JobNotFound(String),

    #[error("job already cancelled: {0}")]
    JobAlreadyCancelled(String),

    #[error("job not running: {0}")]
    JobNotRunning(String),

    #[error("internal error: {0}")]
    Internal(String),
}
