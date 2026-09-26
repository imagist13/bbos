# BBOS 开发日志索引

> 每日开发进度追踪，按日期倒序排列。

| 日期 | 文件 | 主要内容 |
|------|------|----------|
| 2026-09-26 | [day1](./2026-09-26-day1.md) | 骨架完成（Step 1–5），放弃 Nix，改 fake bbdev 全在 Windows 开发 |

## 命名约定

`YYYY-MM-DD-day<N>.md`，同一日多个文件用 `day1`, `day2`... 序号。

## 每篇日志建议结构

```markdown
## Day X: YYYY-MM-DD

### 今日目标
- [ ] 任务 1
- [ ] 任务 2

### 完成情况
- [x] 任务 1 - 描述

### 遇到的问题
- 问题描述及解决方案

### 剩余工作
- 下一步待办

### VM/环境备注
- VM 配置、依赖、特殊步骤
```

## 关联文档

- [`../backend/spec.md`](../backend/spec.md) — 规格书
- [`../backend/dev.md`](../backend/dev.md) — 开发计划（12 步）
- [`../../backend/README.md`](../../backend/README.md) — 后端 README（含当前状态）
