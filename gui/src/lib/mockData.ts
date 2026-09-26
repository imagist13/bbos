/**
 * BBOS Home 工作台 mock 数据。
 *
 * 真实接入 Tauri 之前,先用这部分让 UI 有内容可看。
 * TODO(Phase C): 把 projectFileTree 切换到 workspaceStore,
 *                systemStatus 切换到 backend 检测结果。
 */

import type { LucideIcon } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Version / status                                                          */
/* -------------------------------------------------------------------------- */

export const APP_VERSION = "1.1.0-dev";

export type StatusState = "ready" | "missing" | "checking";

export interface SystemStatus {
  bbdev: StatusState;
  nix: StatusState;
  backend: StatusState;
}

export const MOCK_SYSTEM_STATUS: SystemStatus = {
  bbdev: "ready",
  nix: "ready",
  backend: "checking",
};

/* -------------------------------------------------------------------------- */
/*  Project file tree (Explorer)                                              */
/* -------------------------------------------------------------------------- */

export interface FileNode {
  name: string;
  type: "dir" | "file";
  children?: FileNode[];
}

export interface MockProject {
  name: string;
  path: string;
  structure: FileNode[];
}

export const MOCK_PROJECT: MockProject = {
  name: "workspace",
  path: "/path/to/buckyball",
  structure: [
    {
      name: "examples",
      type: "dir",
      children: [
        {
          name: "chips",
          type: "dir",
          children: [
            {
              name: "toy",
              type: "dir",
              children: [
                { name: "arch", type: "dir" },
                {
                  name: "configs",
                  type: "dir",
                  children: [
                    { name: "chip.toml", type: "file" },
                    {
                      name: "designs",
                      type: "dir",
                      children: [
                        { name: "toy.toml", type: "file" },
                        {
                          name: "tiles",
                          type: "dir",
                          children: [{ name: "default.toml", type: "file" }],
                        },
                      ],
                    },
                    { name: "balldomains", type: "dir" },
                    { name: "gpdomains", type: "dir" },
                  ],
                },
                { name: "workloads", type: "dir" },
              ],
            },
            { name: "pebble", type: "dir" },
            { name: "poly", type: "dir" },
            { name: "goban", type: "dir" },
          ],
        },
        { name: "cores", type: "dir" },
        { name: "balls", type: "dir" },
      ],
    },
    { name: "scripts", type: "dir" },
  ],
};

/* -------------------------------------------------------------------------- */
/*  Chip / Design / Ball ISA configurations                                   */
/* -------------------------------------------------------------------------- */

export interface ChipConfig {
  designs: { include: string };
  sims: Record<string, string>;
  uvm: { balls: string[]; ips: string[] };
}

export const MOCK_CHIP_CONFIG: ChipConfig = {
  designs: { include: "designs/toy.toml" },
  sims: {
    verilator: "sims.verilator.BuckyballToyVerilatorConfig",
    p2e: "sims.p2e.P2EToyLinuxConfig",
    firesim: "sims.firesim.FireSimBuckyballToyConfig",
  },
  uvm: { balls: ["gemmini"], ips: ["axis"] },
};

export interface DesignTile {
  tile_id: number;
  include: string;
  coreDataBytes: number;
  xLen: number;
  vaddrBits: number;
  paddrBits: number;
  cores: { core_id: number; include: string }[];
}

export interface DesignConfig {
  top: { nTiles: number };
  tiles: DesignTile[];
}

export const MOCK_DESIGN_CONFIG: DesignConfig = {
  top: { nTiles: 1 },
  tiles: [
    {
      tile_id: 0,
      include: "tiles/default.toml",
      coreDataBytes: 64,
      xLen: 64,
      vaddrBits: 39,
      paddrBits: 56,
      cores: [{ core_id: 0, include: "core/default.toml" }],
    },
  ],
};

export interface BallInstruction {
  mnemonic: string;
  funct7: number;
  bid: number;
  ball: string;
}

export const MOCK_BALL_ISA: BallInstruction[] = [
  { mnemonic: "GEMMINI_CONFIG", funct7: 2, bid: 0, ball: "GemminiBall" },
  { mnemonic: "GEMMINI_FLUSH", funct7: 3, bid: 0, ball: "GemminiBall" },
  {
    mnemonic: "GEMMINI_COMPUTE_PRELOADED",
    funct7: 66,
    bid: 0,
    ball: "GemminiBall",
  },
  { mnemonic: "BDB_COUNTER", funct7: 4, bid: 1, ball: "TraceBall" },
  { mnemonic: "RELU", funct7: 50, bid: 3, ball: "ReluBall" },
  { mnemonic: "MXFP2INT", funct7: 55, bid: 2, ball: "Mxfp2IntBall" },
];

/* -------------------------------------------------------------------------- */
/*  Simulation templates / bbdev commands                                     */
/* -------------------------------------------------------------------------- */

export interface SimulationTemplate {
  id: string;
  name: string;
  desc: string;
}

export const SIMULATION_TEMPLATES: SimulationTemplate[] = [
  { id: "verilator", name: "Verilator", desc: "RTL simulation" },
  { id: "bebop-verilator", name: "Bebop Verilator", desc: "Fast emulator + verilator" },
  { id: "bemu", name: "BEMU", desc: "Bare metal emulator" },
  { id: "p2e", name: "P2E", desc: "FPGA emulation" },
];

export const SIM_CHIPS = ["toy", "pebble", "poly", "goban"];

export const SIM_BINARIES = [
  "toy-toy-vecunit_matmul_ones-baremetal",
  "toy-toy-vecunit_matmul_random-baremetal",
  "toy-toy-gemmini_matmul-baremetal",
];

export interface BbdevCommand {
  id: string;
  cmd: string;
  /** key into `translations[lang]` */
  labelKey:
    | "actionBuildCompiler"
    | "actionBuildWorkload"
    | "actionRunVerilator"
    | "actionBuildUvm"
    | "actionOpenDocs"
    | "actionJoinCommunity";
  icon: LucideIcon;
}

import { Settings, Terminal } from "lucide-react";

export const BBDEV_COMMANDS: BbdevCommand[] = [
  {
    id: "compiler-build",
    cmd: "bbdev compiler --build",
    labelKey: "actionBuildCompiler",
    icon: Settings,
  },
  {
    id: "workload-build",
    cmd: "bbdev workload --build",
    labelKey: "actionBuildWorkload",
    icon: Settings,
  },
  {
    id: "verilator-run",
    cmd: "bbdev verilator --run",
    labelKey: "actionRunVerilator",
    icon: Terminal,
  },
  {
    id: "uvm-build",
    cmd: "bbdev uvm --build",
    labelKey: "actionBuildUvm",
    icon: Settings,
  },
];
