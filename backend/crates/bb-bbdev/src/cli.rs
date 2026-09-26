//! bbdev 命令构造。

use std::path::PathBuf;
use bb_core::jobs::JobKind;

#[derive(Debug, Clone)]
pub struct BbdevCommand {
    pub args: Vec<String>,
    pub working_dir: PathBuf,
}

impl BbdevCommand {
    /// 从 JobKind 构造 bbdev 命令。
    pub fn from_kind(kind: &JobKind, workspace_root: &PathBuf) -> Self {
        let mut args = vec![];

        match kind {
            JobKind::VerilatorRun { chip, binary, extra_args } => {
                args.push("verilator".to_string());
                args.push("--run".to_string());
                args.push(format!("--chip={}", chip));
                args.push(format!("--binary={}", binary));
                for arg in extra_args {
                    args.push(arg.clone());
                }
            }
            JobKind::WorkloadBuild { chip, workload } => {
                args.push("workload".to_string());
                args.push("--build".to_string());
                args.push(format!("--chip={}", chip));
                args.push(format!("--workload={}", workload));
            }
            JobKind::BemuRun { chip, binary } => {
                args.push("bemu".to_string());
                args.push("--run".to_string());
                args.push(format!("--chip={}", chip));
                args.push(format!("--binary={}", binary));
            }
            JobKind::UvmBuild { test } => {
                args.push("uvm".to_string());
                args.push("--build".to_string());
                args.push(format!("--test={}", test));
            }
            JobKind::UvmRun { test } => {
                args.push("uvm".to_string());
                args.push("--run".to_string());
                args.push(format!("--test={}", test));
            }
            JobKind::Generic { args: generic_args } => {
                for arg in generic_args {
                    args.push(arg.clone());
                }
            }
        }

        Self {
            args,
            working_dir: workspace_root.clone(),
        }
    }

    /// 转换为 tokio::process::Command。
    pub fn to_spawn(&self) -> tokio::process::Command {
        let mut cmd = tokio::process::Command::new("nix");
        cmd.args(["develop", ".#default", "--command", "bbdev"]);
        for arg in &self.args {
            cmd.arg(arg);
        }
        cmd.current_dir(&self.working_dir);
        cmd
    }
}
