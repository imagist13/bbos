//! events — tokio broadcast 总线。

use serde::Serialize;
use tokio::sync::broadcast;
use super::jobs::{JobId, JobState, LogEntry};

#[derive(Debug, Clone, Serialize)]
pub enum BackendEvent {
    StateChanged {
        id: JobId,
        state: JobState,
        exit_code: Option<i32>,
    },
    LogLine {
        id: JobId,
        entry: LogEntry,
    },
}

/// 创建新的事件总线。
pub fn create_event_bus() -> (broadcast::Sender<BackendEvent>, broadcast::Receiver<BackendEvent>) {
    broadcast::channel(256)
}
