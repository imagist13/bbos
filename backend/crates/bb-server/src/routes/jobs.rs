//! jobs — Job 路由：POST /api/jobs, GET /api/jobs, GET /api/jobs/{id}

use std::path::PathBuf;
use axum::{extract::{State, Path}, Json, http::StatusCode};
use serde::Deserialize;
use serde_json::Value;
use bb_core::{Job, JobKind, JobState, JobId};
use crate::state::AppState;
use crate::error::AppError;

#[derive(Debug, Deserialize)]
pub struct CreateJobRequest {
    pub kind: JobKind,
    pub workspace_root: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct JobResponse {
    pub id: JobId,
    pub kind: JobKind,
    pub state: JobState,
    pub created_at: String,
    pub chip: Option<String>,
    pub binary: Option<String>,
    pub exit_code: Option<i32>,
}

impl From<Job> for JobResponse {
    fn from(job: Job) -> Self {
        Self {
            id: job.id,
            kind: job.kind,
            state: job.state,
            created_at: job.created_at.to_rfc3339(),
            chip: job.chip,
            binary: job.binary,
            exit_code: job.exit_code,
        }
    }
}

pub async fn create_job(
    State(s): State<AppState>,
    Json(req): Json<CreateJobRequest>,
) -> Result<(StatusCode, Json<JobResponse>), AppError> {
    let workspace_root = req.workspace_root
        .map(PathBuf::from)
        .unwrap_or_else(|| s.project_service.root().to_path_buf());

    let job = Job::new(req.kind, workspace_root);
    let _ = s.job_store.submit(job.clone()).await;

    // TODO: 推入 worker pool 执行

    let response: JobResponse = job.into();
    Ok((StatusCode::CREATED, Json(response)))
}

pub async fn list_jobs(
    State(s): State<AppState>,
) -> Result<Json<Value>, AppError> {
    let jobs = s.job_store.list().await;
    let responses: Vec<JobResponse> = jobs.into_iter().map(Into::into).collect();
    Ok(Json(serde_json::json!({ "jobs": responses })))
}

pub async fn get_job(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<JobResponse>, AppError> {
    let job = s.job_store.get(&id).await
        .ok_or_else(|| AppError::JobNotFound(id.clone()))?;
    Ok(Json(JobResponse::from(job)))
}
