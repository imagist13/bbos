//! system — 系统路由：health + diagnostics。

use axum::{extract::State, Json};
use serde_json::{json, Value};
use crate::state::AppState;
use bb_bbdev::BbdevStatus;

pub async fn health() -> Json<Value> {
    Json(json!({ "version": env!("CARGO_PKG_VERSION") }))
}

pub async fn diagnostics(State(s): State<AppState>) -> Json<Value> {
    let bbdev = match &s.bbdev_status {
        BbdevStatus::Available { version, path } => json!({
            "available": true,
            "version": version,
            "path": path,
        }),
        BbdevStatus::Unavailable { reason } => json!({
            "available": false,
            "reason": reason,
        }),
    };

    Json(json!({
        "version": env!("CARGO_PKG_VERSION"),
        "bbdev": bbdev,
    }))
}
