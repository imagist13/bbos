//! AppState — bb-server 全局共享状态。

use std::sync::Arc;
use tokio::sync::broadcast;

use bb_core::jobs::JobStoreImpl;
use bb_core::project::ProjectService;
use bb_bbdev::detect::BbdevStatus;

#[derive(Clone)]
pub struct AppState {
    pub project_service: Arc<ProjectService>,
    pub job_store: Arc<JobStoreImpl>,
    pub bbdev_status: BbdevStatus,
    pub shutdown_tx: broadcast::Sender<()>,
}

impl AppState {
    pub async fn new(shutdown_tx: broadcast::Sender<()>) -> Self {
        let bbdev_status = bb_bbdev::detect::detect().await;

        Self {
            project_service: Arc::new(ProjectService::new(
                std::path::PathBuf::from(".") // 默认当前目录，API 可通过 ?root= 覆盖
            )),
            job_store: Arc::new(JobStoreImpl::new()),
            bbdev_status,
            shutdown_tx,
        }
    }
}
