//! ProjectService — 项目服务，管理 chip 和 design 的加载与保存。

use std::path::{Path, PathBuf};
use std::fs;
use crate::config::{ChipConfig, DesignConfig, parse_chip, parse_design, serialize_chip, serialize_design};
use crate::error::CoreError;
use crate::paths::discover_chips;

/// 芯片引用信息（用于 API 返回）
#[derive(Debug, Clone, serde::Serialize)]
pub struct ChipRef {
    pub name: String,
    pub path: PathBuf,
}

pub struct ProjectService {
    root: PathBuf,
}

impl ProjectService {
    pub fn new(root: PathBuf) -> Self {
        Self { root }
    }

    pub fn root(&self) -> &Path {
        &self.root
    }

    /// 列出工作区下所有 chip。
    pub fn list_chips(&self) -> Result<Vec<ChipRef>, CoreError> {
        let chips = discover_chips(&self.root);
        Ok(chips.into_iter().map(|p| {
            ChipRef {
                name: p.file_name()
                    .map(|s| s.to_string_lossy().to_string())
                    .unwrap_or_default(),
                path: p,
            }
        }).collect())
    }

    /// 加载 chip.toml。
    pub fn load_chip(&self, name: &str) -> Result<ChipConfig, CoreError> {
        let path = self.root.join(name).join("chip.toml");
        if !path.exists() {
            return Err(CoreError::ChipNotFound(name.to_string()));
        }
        let content = fs::read_to_string(&path)?;
        parse_chip(&content)
    }

    /// 保存 chip.toml。
    pub fn save_chip(&self, name: &str, config: &ChipConfig) -> Result<(), CoreError> {
        let path = self.root.join(name).join("chip.toml");
        let content = serialize_chip(config)?;
        fs::write(path, content)?;
        Ok(())
    }

    /// 加载单个 design.toml。
    pub fn load_design(&self, chip: &str, name: &str) -> Result<DesignConfig, CoreError> {
        let path = self.root
            .join(chip)
            .join("designs")
            .join(name)
            .with_extension("toml");
        if !path.exists() {
            return Err(CoreError::DesignNotFound(format!("{}/{}", chip, name)));
        }
        let content = fs::read_to_string(&path)?;
        parse_design(&content)
    }

    /// 保存 design.toml。
    pub fn save_design(&self, chip: &str, name: &str, config: &DesignConfig) -> Result<(), CoreError> {
        let path = self.root
            .join(chip)
            .join("designs")
            .join(name)
            .with_extension("toml");
        let content = serialize_design(config)?;
        // 确保父目录存在
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(path, content)?;
        Ok(())
    }
}
