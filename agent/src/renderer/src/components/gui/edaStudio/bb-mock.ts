/**
 * bb-server mock 数据 —— v0.4 阶段 bb-server.exe 缺失,EDA 页面需要的真实数据
 * (chip 列表 / job 状态 / ball 阶段状态 / VCD 文件)先用硬编码 mock。
 *
 * bb-server (Rust sidecar) 落地后,这里每个 export 改成对
 * `src/main/bb/bridge.ts` 的包装:
 *
 *   listChips()          → fetch('/api/projects?root=...')
 *   getWorkspace(chip)   → fetch('/api/workspace/:chip?root=...')
 *   listJobs()           → fetch('/api/jobs')
 *   listBalls()          → 由 bb-server 静态目录扫描得到
 *   getBallStatus(ball)  → 解析 state_store.db
 *   listWaveforms(chip)  → 扫 sim log 目录
 *
 * 类型定义跟 bb-server bridge.ts 对齐(JobInfo / WorkspaceInfo),
 * 这里只新增 balls / waveforms 相关的类型,等真后端出来再统一改名。
 */

/** bb-server 的 JobInfo shape —— 跟 src/main/bb/bridge.ts 保持一致。 */
export type JobInfo = {
  id: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  chip?: string;
  command?: string;
  createdAt: string;
  finishedAt?: string;
  returncode?: number;
};

/** WorkspaceInfo shape —— 跟 src/main/bb/bridge.ts 保持一致。 */
export type WorkspaceInfo = {
  chip: string;
  root: string;
  designs: string[];
  cores: string[];
};

/** Ball 的 5-stage gate 状态。red / green / gray,gray 表示上游未绿、暂不能动。 */
export type StageStatus = 'green' | 'red' | 'gray';

export type BallStage = {
  /** Stage 0 = contract(no code), 1 = C+BEMU, 2 = Compiler+MLIR, 3 = RTL, 4 = PPA+UVM */
  stage: 0 | 1 | 2 | 3 | 4;
  status: StageStatus;
  /** 给人的简短说明(放 hover tooltip + 详情面板)。 */
  note?: string;
};

export type BallInfo = {
  /** ball 目录名,如 'gemmini' / 'matmul' / 'transpose'。 */
  name: string;
  /** 当前注册的 chip,toy 是维护核,production chips 才有固定 ball 集。 */
  core: 'toy' | 'pebble' | 'goban' | 'prefill' | 'decode' | 'rocket' | 'boom';
  /** 5 stage 状态。ball-align skill 的强制规则:上游灰 → 下游必灰。 */
  stages: BallStage[];
};

export type WaveformFile = {
  /** 文件绝对路径,baseName 用来显示。 */
  path: string;
  /** 'vcd' | 'fst' | 'unknown' —— 后缀决定 waveform-mcp 的 open_waveform。 */
  format: 'vcd' | 'fst' | 'unknown';
  /** 生成这个波形的 chip(从父目录名反推)。 */
  chip: string;
  /** 模拟时间(ns)。 */
  simTimeNs?: number;
  /** 文件大小(bytes)。 */
  sizeBytes: number;
  /** mtime ISO string,排序用。 */
  modifiedAt: string;
};

// ---------------------------------------------------------------------------
// 硬编码 mock
// ---------------------------------------------------------------------------

/** chip 列表 —— 跟 examples/chips/ 实际目录对应。 */
export const MOCK_CHIPS: ReadonlyArray<string> = [
  'boom',
  'decode',
  'goban',
  'pebble',
  'prefill',
  'rocket',
  'toy',
];

/** 每个 chip 的 topology mock —— designs + cores,真实数据来自 bb-server。 */
export const MOCK_WORKSPACES: ReadonlyArray<WorkspaceInfo> = [
  {
    chip: 'toy',
    root: 'examples/chips/toy',
    designs: ['designs/baremental.toml', 'designs/vecunit.toml'],
    cores: ['rocket'],
  },
  {
    chip: 'pebble',
    root: 'examples/chips/pebble',
    designs: ['designs/baremetal.toml', 'designs/prefill.toml', 'designs/decode.toml'],
    cores: ['rocket', 'boom'],
  },
  {
    chip: 'goban',
    root: 'examples/chips/goban',
    designs: ['designs/default.toml'],
    cores: ['rocket'],
  },
  {
    chip: 'prefill',
    root: 'examples/chips/prefill',
    designs: ['designs/default.toml'],
    cores: ['rocket'],
  },
  {
    chip: 'decode',
    root: 'examples/chips/decode',
    designs: ['designs/default.toml'],
    cores: ['rocket'],
  },
  {
    chip: 'rocket',
    root: 'examples/chips/rocket',
    designs: ['designs/baremetal.toml'],
    cores: ['rocket'],
  },
  {
    chip: 'boom',
    root: 'examples/chips/boom',
    designs: ['designs/baremetal.toml'],
    cores: ['boom'],
  },
];

/** active + 历史 job mock —— 真实数据来自 bb-server GET /api/jobs。 */
export const MOCK_JOBS: ReadonlyArray<JobInfo> = [
  {
    id: 'tr_a3f1',
    status: 'running',
    chip: 'toy',
    command: 'bbdev_bemu_sim --ball smatmul --test small',
    createdAt: '2026-09-30T14:02:18Z',
  },
  {
    id: 'tr_a3e8',
    status: 'running',
    chip: 'toy',
    command: 'bbdev_verilator_sim --ball int8mul --test small',
    createdAt: '2026-09-30T14:01:55Z',
  },
  {
    id: 'tr_a2c7',
    status: 'success',
    chip: 'pebble',
    command: 'bbdev_bemu_sim --ball gemmini --test bank',
    createdAt: '2026-09-30T13:48:01Z',
    finishedAt: '2026-09-30T13:51:22Z',
    returncode: 0,
  },
  {
    id: 'tr_a2b1',
    status: 'failed',
    chip: 'toy',
    command: 'bbdev_bebop_verilator_sim --ball relu --test small',
    createdAt: '2026-09-30T13:42:11Z',
    finishedAt: '2026-09-30T13:43:47Z',
    returncode: 2,
  },
  {
    id: 'tr_a290',
    status: 'success',
    chip: 'pebble',
    command: 'bbdev_bemu_batch --ball gemmini --binary pebble-gemmini-matmul-baremetal',
    createdAt: '2026-09-30T13:30:00Z',
    finishedAt: '2026-09-30T13:35:10Z',
    returncode: 0,
  },
  {
    id: 'tr_a287',
    status: 'success',
    chip: 'toy',
    command: 'bbdev_bemu_sim --ball transpose --test small',
    createdAt: '2026-09-30T13:21:05Z',
    finishedAt: '2026-09-30T13:21:38Z',
    returncode: 0,
  },
];

/** Ball 列表 + 5-stage gate mock —— examples/balls/ 实际子目录。 */
export const MOCK_BALLS: ReadonlyArray<BallInfo> = [
  {
    name: 'gemmini',
    core: 'pebble',
    stages: [
      { stage: 0, status: 'green', note: 'Contract frozen r3.' },
      { stage: 1, status: 'green', note: 'BEMU ctest green on bank.' },
      { stage: 2, status: 'green', note: 'MLIR test green on BEMU.' },
      { stage: 3, status: 'green', note: 'Verilator small tests green.' },
      { stage: 4, status: 'red', note: 'PPA regression failed (freq -8%).' },
    ],
  },
  {
    name: 'smatmul',
    core: 'toy',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r1.' },
      { stage: 1, status: 'green', note: 'BEMU ctest green.' },
      { stage: 2, status: 'green', note: 'mlirtest green.' },
      { stage: 3, status: 'red', note: 'Verilator small red: SRAM latency mismatch.' },
      { stage: 4, status: 'gray' },
    ],
  },
  {
    name: 'int8mul',
    core: 'toy',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r2.' },
      { stage: 1, status: 'green', note: 'BEMU green.' },
      { stage: 2, status: 'green', note: 'mlirtest green.' },
      { stage: 3, status: 'red', note: 'Verilator red on cycle 412 — running.' },
      { stage: 4, status: 'gray' },
    ],
  },
  {
    name: 'transpose',
    core: 'toy',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r1.' },
      { stage: 1, status: 'green', note: 'BEMU green.' },
      { stage: 2, status: 'green', note: 'mlirtest green.' },
      { stage: 3, status: 'green', note: 'Verilator small green.' },
      { stage: 4, status: 'red', note: 'UVM scoreboard mismatch.' },
    ],
  },
  {
    name: 'relu',
    core: 'toy',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r1.' },
      { stage: 1, status: 'red', note: 'BEMU bank test: addr overflow at iter=BANK_LINES-1.' },
      { stage: 2, status: 'gray' },
      { stage: 3, status: 'gray' },
      { stage: 4, status: 'gray' },
    ],
  },
  {
    name: 'matadd',
    core: 'toy',
    stages: [
      { stage: 0, status: 'red', note: 'Contract pending user confirmation.' },
      { stage: 1, status: 'gray' },
      { stage: 2, status: 'gray' },
      { stage: 3, status: 'gray' },
      { stage: 4, status: 'gray' },
    ],
  },
  {
    name: 'maxpool',
    core: 'toy',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r1.' },
      { stage: 1, status: 'green', note: 'BEMU green.' },
      { stage: 2, status: 'gray' },
      { stage: 3, status: 'gray' },
      { stage: 4, status: 'gray' },
    ],
  },
  {
    name: 'vector',
    core: 'pebble',
    stages: [
      { stage: 0, status: 'green', note: 'Contract r1.' },
      { stage: 1, status: 'green', note: 'BEMU green.' },
      { stage: 2, status: 'green', note: 'mlirtest green.' },
      { stage: 3, status: 'green', note: 'Verilator small green.' },
      { stage: 4, status: 'green', note: 'PPA + UVM green (signoff).' },
    ],
  },
];

/** VCD/FST 波形文件 mock —— 真实数据扫 bb-server 的 sim log 目录。 */
export const MOCK_WAVEFORMS: ReadonlyArray<WaveformFile> = [
  {
    path: 'bb-tests/build/sim/toy/relu_small.vcd',
    format: 'vcd',
    chip: 'toy',
    simTimeNs: 12_500,
    sizeBytes: 8_421_000,
    modifiedAt: '2026-09-30T13:43:42Z',
  },
  {
    path: 'bb-tests/build/sim/toy/int8mul_small.vcd',
    format: 'vcd',
    chip: 'toy',
    simTimeNs: 4_800,
    sizeBytes: 3_120_500,
    modifiedAt: '2026-09-30T13:42:11Z',
  },
  {
    path: 'bb-tests/build/sim/pebble/gemmini_bank.vcd',
    format: 'vcd',
    chip: 'pebble',
    simTimeNs: 120_000,
    sizeBytes: 142_200_000,
    modifiedAt: '2026-09-30T13:35:08Z',
  },
  {
    path: 'bb-tests/build/sim/pebble/gemmini_ppa.fst',
    format: 'fst',
    chip: 'pebble',
    simTimeNs: 80_000,
    sizeBytes: 18_700_000,
    modifiedAt: '2026-09-30T13:30:55Z',
  },
  {
    path: 'bb-tests/build/sim/toy/transpose_small.vcd',
    format: 'vcd',
    chip: 'toy',
    simTimeNs: 6_200,
    sizeBytes: 4_010_300,
    modifiedAt: '2026-09-30T13:21:38Z',
  },
];
