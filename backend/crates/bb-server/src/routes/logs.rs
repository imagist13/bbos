//! logs — SSE 日志流：GET /api/jobs/:id/logs

use axum::{
    extract::{State, Path},
    response::sse::Event,
};
use futures_util::stream;
use crate::state::AppState;
use crate::error::AppError;

pub async fn job_logs(
    State(s): State<AppState>,
    Path(id): Path<String>,
) -> Result<impl axum::response::IntoResponse, AppError> {
    // 验证 job 存在
    let _ = s.job_store.get(&id).await
        .ok_or_else(|| AppError::JobNotFound(id.clone()))?;

    let rx = s.job_store.subscribe_logs();

    let stream = stream::unfold(rx, move |mut rx| async move {
        match rx.recv().await {
            Ok(event) => {
                let event_data = serde_json::to_string(&event).ok()?;
                let ev = Event::default()
                    .event("log")
                    .data(event_data);
                Some((Ok::<_, std::convert::Infallible>(ev), rx))
            }
            Err(_) => None,
        }
    });

    Ok(axum::response::sse::Sse::new(stream))
}
