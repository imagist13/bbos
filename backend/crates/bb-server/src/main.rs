//! bb-server — BBOS 后端 HTTP 服务器（axum）。
//!
//! 入口点：解析参数 → 初始化日志 → 构建 AppState → 启动 HTTP server → 优雅关闭。

mod routes;
mod state;
mod error;

use std::net::SocketAddr;
use tokio::sync::broadcast;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::state::AppState;
use crate::routes::build_router;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 初始化 tracing（日志输出到文件 + stderr）
    let log_dir = dirs::data_local_dir()
        .unwrap_or_else(|| std::path::PathBuf::from("."))
        .join("bbos")
        .join("logs");
    std::fs::create_dir_all(&log_dir).ok();

    let file_appender = tracing_appender::rolling::daily(&log_dir, "bb-server.log");
    let (file_writer, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(file_writer)
                .with_ansi(false)
        )
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stderr)
        )
        .with(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // 解析命令行参数
    let args = Args::parse();

    // 构建 AppState
    let (shutdown_tx, _) = broadcast::channel::<()>(1);
    let state = AppState::new(shutdown_tx.clone()).await;

    // 启动 HTTP server
    let addr = SocketAddr::from(([127, 0, 0, 1], args.port));

    let app = build_router(state.clone());

    // SIGINT / Ctrl+C 处理
    let mut shutdown_rx = state.shutdown_tx.subscribe();
    let shutdown_tx_for_signal = shutdown_tx.clone();
    tokio::spawn(async move {
        tokio::signal::ctrl_c().await.ok();
        tracing::info!("Received Ctrl+C, initiating graceful shutdown...");
        let _ = shutdown_tx_for_signal.send(());
    });

    // 先 bind，拿到实际端口（当 port=0 时由 OS 分配）
    let listener = tokio::net::TcpListener::bind(addr).await?;
    let actual_addr = listener.local_addr()?;
    tracing::info!("bb-server v{} listening on {}", env!("CARGO_PKG_VERSION"), actual_addr);
    eprintln!("LISTENING 127.0.0.1:{}", actual_addr.port()); // Tauri 读取此行

    let server = axum::serve(
        listener,
        app.into_make_service(),
    )
    .with_graceful_shutdown(async move {
        shutdown_rx.recv().await.ok();
    });

    server.await?;
    tracing::info!("bb-server stopped");
    Ok(())
}

// -------------------------------------------------------------------
// CLI argument parsing
// -------------------------------------------------------------------

struct Args {
    port: u16,
}

impl Args {
    fn parse() -> Self {
        let mut port: u16 = 0; // 0 = 随机端口

        let args: Vec<String> = std::env::args().collect();
        for i in 0..args.len() {
            if args[i] == "--port" && i + 1 < args.len() {
                if let Ok(p) = args[i + 1].parse() {
                    port = p;
                }
            }
        }

        Self { port }
    }
}
