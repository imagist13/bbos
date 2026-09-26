//! cancel — Job 取消：POST /api/jobs/:id/cancel

use axum::{extract::{State, Path}, Json};
use serde_json::Value;
use crate::state::AppState;
use crate::error::AppError;
use bb_core::JobState;

pub async fn cancel_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let job = s.job_store.get(&id).await
        .ok_or_else(|| AppError::JobNotFound(id.clone()))?;

    if job.state == JobState::Cancelled {
        return Err(AppError::JobAlreadyCancelled(id));
    }
    if job.state != JobState::Running {
        return Err(AppError::JobNotRunning(id));
    }

    // TODO: 调用 bbdev cancel
    s.job_store.update_state(&id, JobState::Cancelled, None).await;

    Ok(Json(serde_json::json!({ "id": id, "state": "cancelled" })))
}
