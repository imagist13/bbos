//! HTTP 路由模块。

pub mod system;
pub mod projects;
pub mod workspace;
pub mod jobs;
pub mod logs;
pub mod cancel;

use axum::Router;
use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    Router::new()
        .nest("/api", api_routes())
        .with_state(state)
}

fn api_routes() -> Router<AppState> {
    Router::new()
        .route("/health", axum::routing::get(system::health))
        .route("/diagnostics", axum::routing::get(system::diagnostics))
        .route("/projects", axum::routing::get(projects::list_projects))
        .route("/workspace/{chip}", axum::routing::get(workspace::get_workspace))
        .route("/workspace/{chip}", axum::routing::put(workspace::put_workspace))
        .route("/jobs", axum::routing::post(jobs::create_job))
        .route("/jobs", axum::routing::get(jobs::list_jobs))
        .route("/jobs/{id}", axum::routing::get(jobs::get_job))
        .route("/jobs/{id}/logs", axum::routing::get(logs::job_logs))
        .route("/jobs/{id}/cancel", axum::routing::post(cancel::cancel_job))
}
