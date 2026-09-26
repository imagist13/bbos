//! bb-bbdev: bbdev 子进程网关。
//!
//! 主要模块：
//! - [`detect`] — 探测 bbdev 是否可用及版本
//! - [`cli`] — 命令构造
//! - [`process`] — 进程启动、日志读取、取消

pub mod detect;
pub mod cli;
pub mod process;

pub use detect::BbdevStatus;
pub use process::{BbdevProcess, RunError, CancelError};
