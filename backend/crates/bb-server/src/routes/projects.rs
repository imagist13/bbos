//! projects — 项目路由：GET /api/projects

use std::collections::HashMap;
use std::path::PathBuf;
use axum::{extract::{State, Query}, Json};
use serde_json::{json, Value};
use crate::state::AppState;
use crate::error::AppError;

pub async fn list_projects(
    State(s): State<AppState>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<Value>, AppError> {
    let root: PathBuf = params.get("root")
        .map(PathBuf::from)
        .unwrap_or_else(|| s.project_service.root().to_path_buf());

    let project_service = bb_core::project::ProjectService::new(root);
    let chips = project_service.list_chips().map_err(AppError::from)?;

    Ok(Json(json!({ "chips": chips })))
}
