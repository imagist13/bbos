//! 统一错误类型 → HTTP 响应。

use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;

#[derive(Debug)]
pub enum AppError {
    Internal(String),
    BbdevUnavailable(String),
    WorkspaceNotFound(String),
    ChipNotFound(String),
    DesignNotFound(String),
    ConfigParse(String),
    JobNotFound(String),
    JobAlreadyCancelled(String),
    JobNotRunning(String),
    PermissionDenied(String),
    InvalidRequest(String),
    MissingParam(String),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, code, message) = match &self {
            AppError::Internal(msg) => (StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", msg.clone()),
            AppError::BbdevUnavailable(msg) => (StatusCode::SERVICE_UNAVAILABLE, "BBDEV_UNAVAILABLE", msg.clone()),
            AppError::WorkspaceNotFound(msg) => (StatusCode::NOT_FOUND, "WORKSPACE_NOT_FOUND", msg.clone()),
            AppError::ChipNotFound(msg) => (StatusCode::NOT_FOUND, "CHIP_NOT_FOUND", msg.clone()),
            AppError::DesignNotFound(msg) => (StatusCode::NOT_FOUND, "DESIGN_NOT_FOUND", msg.clone()),
            AppError::ConfigParse(msg) => (StatusCode::UNPROCESSABLE_ENTITY, "CONFIG_PARSE_ERROR", msg.clone()),
            AppError::JobNotFound(msg) => (StatusCode::NOT_FOUND, "JOB_NOT_FOUND", msg.clone()),
            AppError::JobAlreadyCancelled(msg) => (StatusCode::CONFLICT, "JOB_ALREADY_CANCELLED", msg.clone()),
            AppError::JobNotRunning(msg) => (StatusCode::CONFLICT, "JOB_NOT_RUNNING", msg.clone()),
            AppError::PermissionDenied(msg) => (StatusCode::FORBIDDEN, "PERMISSION_DENIED", msg.clone()),
            AppError::InvalidRequest(msg) => (StatusCode::BAD_REQUEST, "INVALID_REQUEST", msg.clone()),
            AppError::MissingParam(msg) => (StatusCode::BAD_REQUEST, "INVALID_REQUEST", format!("missing required param: {}", msg)),
        };

        let body = Json(json!({
            "code": code,
            "message": message,
            "detail": null,
        }));

        (status, body).into_response()
    }
}

impl From<bb_core::error::CoreError> for AppError {
    fn from(e: bb_core::error::CoreError) -> Self {
        use bb_core::error::CoreError::*;
        match e {
            WorkspaceNotFound(s) => AppError::WorkspaceNotFound(s),
            ChipNotFound(s) => AppError::ChipNotFound(s),
            DesignNotFound(s) => AppError::DesignNotFound(s),
            TomlParse(s) => AppError::ConfigParse(s),
            TomlSerialize(s) => AppError::ConfigParse(s),
            JobNotFound(s) => AppError::JobNotFound(s),
            JobAlreadyCancelled(s) => AppError::JobAlreadyCancelled(s),
            JobNotRunning(s) => AppError::JobNotRunning(s),
            PathOutsideWorkspace(s) => AppError::PermissionDenied(s),
            Internal(s) => AppError::Internal(s),
            Io(e) => AppError::Internal(e.to_string()),
        }
    }
}
