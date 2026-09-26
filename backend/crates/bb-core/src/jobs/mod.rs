//! 任务状态与 JobStore。

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use tokio::sync::broadcast;

pub type JobId = String;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum JobState {
    Pending,
    Running,
    Succeeded,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", content = "data")]
pub enum JobKind {
    #[serde(rename = "verilator_run")]
    VerilatorRun { chip: String, binary: String, extra_args: Vec<String> },
    #[serde(rename = "workload_build")]
    WorkloadBuild { chip: String, workload: String },
    #[serde(rename = "bemu_run")]
    BemuRun { chip: String, binary: String },
    #[serde(rename = "uvm_build")]
    UvmBuild { test: String },
    #[serde(rename = "uvm_run")]
    UvmRun { test: String },
    #[serde(rename = "generic")]
    Generic { args: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Job {
    pub id: JobId,
    pub kind: JobKind,
    pub state: JobState,
    pub created_at: DateTime<Utc>,
    pub chip: Option<String>,
    pub binary: Option<String>,
    pub workspace_root: PathBuf,
    pub exit_code: Option<i32>,
}

impl Job {
    pub fn new(kind: JobKind, workspace_root: PathBuf) -> Self {
        let (chip, binary) = match &kind {
            JobKind::VerilatorRun { chip, binary, .. } => (Some(chip.clone()), Some(binary.clone())),
            JobKind::WorkloadBuild { chip, .. } => (Some(chip.clone()), None),
            JobKind::BemuRun { chip, binary, .. } => (Some(chip.clone()), Some(binary.clone())),
            _ => (None, None),
        };

        Self {
            id: Uuid::new_v4().to_string(),
            kind,
            state: JobState::Pending,
            created_at: Utc::now(),
            chip,
            binary,
            workspace_root,
            exit_code: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LogEntry {
    pub line: String,
    pub stream: Stream,
    pub ts: DateTime<Utc>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Stream {
    Stdout,
    Stderr,
}

impl Stream {
    pub fn as_str(&self) -> &'static str {
        match self {
            Stream::Stdout => "stdout",
            Stream::Stderr => "stderr",
        }
    }
}

// -------------------------------------------------------------------
// JobStore — 内存实现
// -------------------------------------------------------------------

use std::sync::Arc;
use tokio::sync::RwLock;
use crate::events::BackendEvent;

/// 内存中的 JobStore 实现。
pub struct JobStoreImpl {
    jobs: Arc<RwLock<std::collections::HashMap<JobId, Job>>>,
    event_tx: broadcast::Sender<BackendEvent>,
}

impl JobStoreImpl {
    pub fn new() -> Self {
        let (event_tx, _) = broadcast::channel(256);
        Self {
            jobs: Arc::new(RwLock::new(std::collections::HashMap::new())),
            event_tx,
        }
    }

    /// 提交新 job。
    pub async fn submit(&self, job: Job) -> JobId {
        let id = job.id.clone();
        let mut jobs = self.jobs.write().await;
        jobs.insert(id.clone(), job);
        id
    }

    /// 获取 job。
    pub async fn get(&self, id: &JobId) -> Option<Job> {
        let jobs = self.jobs.read().await;
        jobs.get(id).cloned()
    }

    /// 列出所有 job。
    pub async fn list(&self) -> Vec<Job> {
        let jobs = self.jobs.read().await;
        jobs.values().cloned().collect()
    }

    /// 更新 job 状态。
    pub async fn update_state(&self, id: &JobId, state: JobState, exit_code: Option<i32>) {
        let mut jobs = self.jobs.write().await;
        if let Some(job) = jobs.get_mut(id) {
            job.state = state;
            job.exit_code = exit_code;
        }
        let _ = self.event_tx.send(BackendEvent::StateChanged {
            id: id.clone(),
            state,
            exit_code,
        });
    }

    /// 订阅状态变更事件。
    pub fn subscribe_state(&self) -> broadcast::Receiver<BackendEvent> {
        self.event_tx.subscribe()
    }

    /// 推送日志行。
    pub async fn push_log(&self, id: &JobId, entry: LogEntry) {
        let _ = self.event_tx.send(BackendEvent::LogLine {
            id: id.clone(),
            entry,
        });
    }

    /// 获取日志流订阅。
    pub fn subscribe_logs(&self) -> broadcast::Receiver<BackendEvent> {
        self.event_tx.subscribe()
    }
}

impl Default for JobStoreImpl {
    fn default() -> Self {
        Self::new()
    }
}
