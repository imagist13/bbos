//! chip.toml / design.toml 解析和序列化。

use serde::{Deserialize, Serialize};
use crate::error::CoreError;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ChipConfig {
    #[serde(default)]
    pub designs: DesignInclude,

    #[serde(default)]
    pub sims: toml::Table,

    #[serde(default)]
    pub uvm: Option<UvmConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct DesignInclude {
    #[serde(default)]
    pub include: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UvmConfig {
    #[serde(default)]
    pub balls: Vec<String>,
    #[serde(default)]
    pub ips: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DesignConfig {
    pub top: TopConfig,
    #[serde(default)]
    pub tiles: Vec<TileConfig>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct TopConfig {
    #[serde(default = "default_ntiles")]
    pub nTiles: usize,
}

fn default_ntiles() -> usize { 1 }

#[derive(Debug, Clone, Serialize, Deserialize)]
#[allow(non_snake_case)]
pub struct TileConfig {
    #[serde(default)]
    pub tile_id: usize,
    #[serde(default)]
    pub include: String,
    #[serde(default = "default_core_data_bytes")]
    pub coreDataBytes: usize,
    #[serde(default = "default_xlen")]
    pub xLen: usize,
    #[serde(default = "default_vaddr_bits")]
    pub vaddrBits: usize,
    #[serde(default = "default_paddr_bits")]
    pub paddrBits: usize,
}

fn default_core_data_bytes() -> usize { 64 }
fn default_xlen() -> usize { 64 }
fn default_vaddr_bits() -> usize { 39 }
fn default_paddr_bits() -> usize { 56 }

/// 解析 chip.toml 内容。
pub fn parse_chip(content: &str) -> Result<ChipConfig, CoreError> {
    toml::from_str(content).map_err(|e| CoreError::TomlParse(e.to_string()))
}

/// 解析 design.toml 内容。
pub fn parse_design(content: &str) -> Result<DesignConfig, CoreError> {
    toml::from_str(content).map_err(|e| CoreError::TomlParse(e.to_string()))
}

/// 序列化 chip.toml 内容。
pub fn serialize_chip(c: &ChipConfig) -> Result<String, CoreError> {
    toml::to_string_pretty(c).map_err(|e| CoreError::TomlSerialize(e.to_string()))
}

/// 序列化 design.toml 内容。
pub fn serialize_design(c: &DesignConfig) -> Result<String, CoreError> {
    toml::to_string_pretty(c).map_err(|e| CoreError::TomlSerialize(e.to_string()))
}
