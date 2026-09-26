//! workspace — 工作区路由：GET/PUT /api/workspace/{chip}

use std::collections::HashMap;
use std::path::PathBuf;
use axum::{extract::{State, Path, Query}, Json, http::StatusCode};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use crate::state::AppState;
use crate::error::AppError;

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceResponse {
    pub chip: bb_core::config::ChipConfig,
    pub designs: Vec<DesignEntry>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DesignEntry {
    pub name: String,
    pub config: bb_core::config::DesignConfig,
}

#[derive(Debug, Deserialize)]
pub struct PutWorkspaceRequest {
    pub chip: bb_core::config::ChipConfig,
    pub designs: Vec<DesignEntry>,
}

fn resolve_root(s: &AppState, params: &HashMap<String, String>) -> PathBuf {
    params.get("root")
        .map(PathBuf::from)
        .unwrap_or_else(|| s.project_service.root().to_path_buf())
}

pub async fn get_workspace(
    State(s): State<AppState>,
    Path(chip): Path<String>,
    Query(params): Query<HashMap<String, String>>,
) -> Result<Json<WorkspaceResponse>, AppError> {
    let root = resolve_root(&s, &params);
    let project_service = bb_core::project::ProjectService::new(root);
    let chip_config = project_service.load_chip(&chip)?;

    // TODO: 列出 designs/*.toml
    let designs = vec![];

    Ok(Json(WorkspaceResponse { chip: chip_config, designs }))
}

pub async fn put_workspace(
    State(s): State<AppState>,
    Path(chip): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    Json(req): Json<PutWorkspaceRequest>,
) -> Result<(StatusCode, Json<Value>), AppError> {
    let root = resolve_root(&s, &params);
    let project_service = bb_core::project::ProjectService::new(root);
    project_service.save_chip(&chip, &req.chip)?;
    Ok((StatusCode::OK, Json(serde_json::json!({ "ok": true }))))
}
