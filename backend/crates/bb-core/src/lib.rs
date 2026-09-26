//! bb-core: 业务核心库，无 IO 边界，所有外部依赖通过 trait 注入。
//!
//! 主要模块：
//! - [`paths`] — 路径规范化和越界检查
//! - [`config`] — chip.toml / design.toml 解析
//! - [`project`] — ProjectService
//! - [`jobs`] — Job 状态机、内存 store
//! - [`events`] — tokio broadcast 总线

pub mod error;
pub mod paths;
pub mod config;
pub mod project;
pub mod jobs;
pub mod events;

// Re-export commonly used types
pub use jobs::{Job, JobKind, JobId, JobState, LogEntry, Stream, JobStoreImpl};
