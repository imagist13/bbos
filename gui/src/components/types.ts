/**
 * Home 工作台共享类型。
 *
 * 仅放 Home 业务相关的类型。通用 UI 类型继续走 `src/components/ui/*`。
 */

import type { FileNode } from "@/lib/mockData";

/** Home 工作台的主分区(对应左抽屉的 4 个 group)。 */
export type HomeTab = "chip" | "design" | "ball" | "sim";

/** 主分区下的子页面(对应左抽屉的展开项)。 */
export type ChipSubTab =
  | "chip-config"
  | "chip-design-include"
  | "chip-sim-targets"
  | "chip-uvm";

export type DesignSubTab = "design-layout" | "design-top" | "design-tiles";

export type BallSubTab = "ball-isa" | "ball-list";

export type SimSubTab = "sim-control" | "sim-terminal" | "sim-commands";

export type HomeSubTab =
  | ChipSubTab
  | DesignSubTab
  | BallSubTab
  | SimSubTab;

/** 右面板两个 tab。 */
export type RightSection = "explorer" | "agent";

/** AI Agent 提供方。 */
export interface AgentProfile {
  id: "claude" | "codex" | "gemini";
  name: string;
  color: string;
  icon: string;
  desc: string;
}

export interface AgentMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  code?: string;
}

/** 仿真日志条目。 */
export interface SimLogEntry {
  type: "info" | "success" | "warning" | "error";
  text: string;
}

/** 单条左侧抽屉项。 */
export interface DrawerItem {
  id: HomeSubTab;
  labelKey:
    | "chipFile"
    | "designInclude"
    | "simulationTargets"
    | "uvmConfig"
    | "tileCoreLayout"
    | "topConfig"
    | "tiles"
    | "instructions"
    | "allBalls"
    | "simControl"
    | "terminalOutput"
    | "quickCommands";
}

/** 单个抽屉分组。 */
export interface DrawerGroup {
  id: HomeTab;
  labelKey: "chip" | "designs" | "ballIsa" | "simulator";
  icon: "settings" | "layout" | "zap" | "terminal";
  items: DrawerItem[];
}

/** 文件树渲染用 props。 */
export interface ExplorerProps {
  data: FileNode[];
  onSelect: (item: FileNode, path: string) => void;
  selected: string | null;
}

export interface TreeItemProps {
  item: FileNode;
  path: string;
  level: number;
  selected: string | null;
  onSelect: (item: FileNode, path: string) => void;
}
