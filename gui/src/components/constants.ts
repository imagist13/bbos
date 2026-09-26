/**
 * Home 工作台常量。
 *
 * 仅放静态配置:抽屉分组、主分区默认子 tab、Agent 列表、快捷提示。
 */

import type {
  AgentProfile,
  DrawerGroup,
  HomeSubTab,
  HomeTab,
} from "./types";

/** 左抽屉 4 个分组的展开项配置。 */
export const DRAWER_GROUPS: DrawerGroup[] = [
  {
    id: "chip",
    labelKey: "chip",
    icon: "settings",
    items: [
      { id: "chip-config", labelKey: "chipFile" },
      { id: "chip-design-include", labelKey: "designInclude" },
      { id: "chip-sim-targets", labelKey: "simulationTargets" },
      { id: "chip-uvm", labelKey: "uvmConfig" },
    ],
  },
  {
    id: "design",
    labelKey: "designs",
    icon: "layout",
    items: [
      { id: "design-layout", labelKey: "tileCoreLayout" },
      { id: "design-top", labelKey: "topConfig" },
      { id: "design-tiles", labelKey: "tiles" },
    ],
  },
  {
    id: "ball",
    labelKey: "ballIsa",
    icon: "zap",
    items: [
      { id: "ball-isa", labelKey: "instructions" },
      { id: "ball-list", labelKey: "allBalls" },
    ],
  },
  {
    id: "sim",
    labelKey: "simulator",
    icon: "terminal",
    items: [
      { id: "sim-control", labelKey: "simControl" },
      { id: "sim-terminal", labelKey: "terminalOutput" },
      { id: "sim-commands", labelKey: "quickCommands" },
    ],
  },
];

/** 切换主分区时默认进入的子 tab。 */
export const DEFAULT_SUB_TABS: Record<HomeTab, HomeSubTab> = {
  chip: "chip-config",
  design: "design-layout",
  ball: "ball-isa",
  sim: "sim-control",
};

/** AI Agent 提供方。 */
export const AGENTS: AgentProfile[] = [
  { id: "claude", name: "Claude", color: "#d4a574", icon: "A", desc: "复杂推理" },
  { id: "codex", name: "Codex", color: "#009c83", icon: "C", desc: "代码生成" },
  { id: "gemini", name: "Gemini", color: "#4285f4", icon: "G", desc: "多模态" },
];

/** 不同主分区下的 Agent 快捷提问。 */
export const WORKFLOW_HINTS: Record<HomeTab, string[]> = {
  chip: ["添加新的仿真目标", "配置 UVM 参数", "检查设计包含路径"],
  design: ["添加新的 Tile", "调整 Core 参数", "生成默认配置"],
  ball: ["注册新指令", "查看 Ball 依赖", "生成 ISA 测试"],
  sim: ["调试仿真错误", "优化仿真速度", "分析波形输出"],
};
