/**
 * BBOS 国际化文案（zh / en）。
 *
 * 集中放在 `src/lib/i18n.ts`，避免组件里出现零散硬编码。
 * Key 命名按 SPEC §6 的模块分组：app / header / sidebar / drawer /
 * editor.chip / editor.design / editor.ball / editor.sim / agent / status / footer。
 */

export type Lang = "zh" | "en";

export const LANGUAGES: { id: Lang; label: string; native: string }[] = [
  { id: "zh", label: "中文", native: "简体中文" },
  { id: "en", label: "English", native: "English" },
];

type TranslationKey =
  // app
  | "appName"
  | "webPreview"
  | "nixRequired"
  | "settings"
  // sidebar / drawer
  | "workspace"
  | "searchFiles"
  | "new"
  | "import"
  | "config"
  // tabs
  | "chip"
  | "designs"
  | "ballIsa"
  | "simulator"
  // chip editor
  | "chipConfig"
  | "chipFile"
  | "designInclude"
  | "designFilePath"
  | "simulationTargets"
  | "uvmConfig"
  | "balls"
  | "ips"
  | "save"
  | "saved"
  // design editor
  | "designConfig"
  | "tileCoreLayout"
  | "topConfig"
  | "numTiles"
  | "tiles"
  | "addTile"
  | "tile"
  | "id"
  | "active"
  | "coreDataBytes"
  | "xlen"
  | "vaddrBits"
  | "paddrBits"
  | "include"
  // ball isa
  | "ballIsaEditor"
  | "instructions"
  | "addInstruction"
  | "searchInstructions"
  | "allBalls"
  | "mnemonic"
  | "funct7"
  | "ballId"
  | "ball"
  | "actions"
  | "edit"
  // simulator
  | "simControl"
  | "ready"
  | "running"
  | "selectChip"
  | "selectSimulator"
  | "selectBinary"
  | "run"
  | "stop"
  | "quickCommands"
  | "terminalOutput"
  | "clear"
  | "exitCode"
  | "waveformSaved"
  | "selectBinaryFirst"
  | "readyToSimulate"
  | "simStopped"
  // agent
  | "agentAssistant"
  | "agentWelcome"
  | "sendMessage"
  | "agentChat"
  | "selectAgent"
  | "thinking"
  | "copyCode"
  | "copied"
  | "clearChat"
  | "quickActions"
  // hero (legacy)
  | "heroTitle"
  | "heroSubtitle"
  | "openWorkspace"
  | "openWorkspaceHint"
  | "recentWorkspaces"
  | "noRecent"
  | "newProject"
  // actions (legacy, used by Simulator quick commands)
  | "actionBuildCompiler"
  | "actionBuildWorkload"
  | "actionRunVerilator"
  | "actionBuildUvm"
  | "actionOpenDocs"
  | "actionJoinCommunity"
  // status
  | "systemStatus"
  | "bbdevDetected"
  | "bbdevMissing"
  | "nixReady"
  | "nixMissing"
  | "backendOnline"
  | "backendOffline"
  | "checking"
  // recent
  | "openedRelative"
  | "path"
  // footer
  | "version"
  | "docs"
  | "feedback"
  | "shortcuts";

const translations = {
  zh: {
    appName: "BBOS",
    webPreview: "网页预览",
    nixRequired: "Nix 环境未安装，部分功能不可用",
    settings: "设置",

    workspace: "工作区",
    searchFiles: "搜索文件...",
    new: "新建",
    import: "导入",
    config: "配置",

    chip: "芯片",
    designs: "设计",
    ballIsa: "Ball ISA",
    simulator: "仿真器",

    chipConfig: "芯片配置",
    chipFile: "chip.toml",
    designInclude: "设计包含",
    designFilePath: "设计文件路径",
    simulationTargets: "仿真目标",
    uvmConfig: "UVM 配置",
    balls: "Balls",
    ips: "IPs",
    save: "保存",
    saved: "已保存",

    designConfig: "设计配置",
    tileCoreLayout: "Tile 和 Core 布局",
    topConfig: "顶层配置",
    numTiles: "Tile 数量",
    tiles: "Tiles",
    addTile: "添加 Tile",
    tile: "Tile",
    id: "ID",
    active: "活跃",
    coreDataBytes: "核心数据 (B)",
    xlen: "XLEN",
    vaddrBits: "虚拟地址位宽",
    paddrBits: "物理地址位宽",
    include: "包含",

    ballIsaEditor: "Ball ISA 编辑器",
    instructions: "指令",
    addInstruction: "添加指令",
    searchInstructions: "搜索指令...",
    allBalls: "所有 Balls",
    mnemonic: "助记符",
    funct7: "funct7",
    ballId: "Ball ID",
    ball: "Ball",
    actions: "操作",
    edit: "编辑",

    simControl: "仿真控制",
    ready: "准备就绪",
    running: "运行中",
    selectChip: "芯片",
    selectSimulator: "仿真器",
    selectBinary: "二进制文件",
    run: "运行",
    stop: "停止",
    quickCommands: "快捷命令",
    terminalOutput: "终端输出",
    clear: "清空",
    exitCode: "退出码",
    waveformSaved: "波形已保存",
    selectBinaryFirst: "请先选择二进制文件...",
    readyToSimulate: "准备开始仿真...\n选择芯片、仿真器和二进制文件后开始。",
    simStopped: ">>> 仿真被用户停止",

    agentAssistant: "AI 助手",
    agentWelcome: "问我任何关于芯片配置、设计、仿真的问题",
    sendMessage: "发送消息...",
    agentChat: "Agent 对话",
    selectAgent: "选择 Agent",
    thinking: "思考中...",
    copyCode: "复制代码",
    copied: "已复制!",
    clearChat: "清空对话",
    quickActions: "快捷操作",

    heroTitle: "欢迎使用 BBOS",
    heroSubtitle: "为 Buckyball DSA 开发者打造的桌面工作台",
    openWorkspace: "打开工作区",
    openWorkspaceHint: "选择包含 examples/ 的 buckyball 仓库根目录",
    recentWorkspaces: "最近打开",
    noRecent: "暂无最近工作区。打开一个 buckyball 仓库即可开始。",
    newProject: "新建项目",

    actionBuildCompiler: "构建编译器",
    actionBuildWorkload: "构建 Workload",
    actionRunVerilator: "运行 Verilator",
    actionBuildUvm: "构建 UVM",
    actionOpenDocs: "打开文档",
    actionJoinCommunity: "加入社区",

    systemStatus: "系统状态",
    bbdevDetected: "bbdev 已就绪",
    bbdevMissing: "未检测到 bbdev",
    nixReady: "Nix 环境就绪",
    nixMissing: "Nix 环境缺失",
    backendOnline: "后端在线",
    backendOffline: "后端离线",
    checking: "检测中…",

    openedRelative: "打开于 {when}",
    path: "路径",

    version: "版本 {version}",
    docs: "文档",
    feedback: "反馈",
    shortcuts: "快捷键",
  },
  en: {
    appName: "BBOS",
    webPreview: "Web Preview",
    nixRequired: "Nix required for full functionality",
    settings: "Settings",

    workspace: "Workspace",
    searchFiles: "Search files...",
    new: "New",
    import: "Import",
    config: "Configuration",

    chip: "Chip",
    designs: "Designs",
    ballIsa: "Ball ISA",
    simulator: "Simulator",

    chipConfig: "Chip Configuration",
    chipFile: "chip.toml",
    designInclude: "Design Include",
    designFilePath: "Design File Path",
    simulationTargets: "Simulation Targets",
    uvmConfig: "UVM Configuration",
    balls: "Balls",
    ips: "IPs",
    save: "Save",
    saved: "Saved",

    designConfig: "Design Configuration",
    tileCoreLayout: "Tile and Core Layout",
    topConfig: "Top Configuration",
    numTiles: "Number of Tiles",
    tiles: "Tiles",
    addTile: "Add Tile",
    tile: "Tile",
    id: "ID",
    active: "Active",
    coreDataBytes: "Core Data (B)",
    xlen: "XLEN",
    vaddrBits: "VAddr Bits",
    paddrBits: "PAddr Bits",
    include: "Include",

    ballIsaEditor: "Ball ISA Editor",
    instructions: "instructions",
    addInstruction: "Add Instruction",
    searchInstructions: "Search instructions...",
    allBalls: "All Balls",
    mnemonic: "Mnemonic",
    funct7: "funct7",
    ballId: "Ball ID",
    ball: "Ball",
    actions: "Actions",
    edit: "Edit",

    simControl: "Simulation Control",
    ready: "Ready",
    running: "Running",
    selectChip: "Chip",
    selectSimulator: "Simulator",
    selectBinary: "Binary",
    run: "Run",
    stop: "Stop",
    quickCommands: "Quick Commands",
    terminalOutput: "Terminal Output",
    clear: "Clear",
    exitCode: "Exit code",
    waveformSaved: "Waveform saved",
    selectBinaryFirst: "Please select a binary first...",
    readyToSimulate: "Ready to run simulation...\nSelect chip, simulator, and binary to begin.",
    simStopped: ">>> Simulation stopped by user",

    agentAssistant: "AI Assistant",
    agentWelcome: "Ask me anything about chip config, design, or simulation",
    sendMessage: "Send a message...",
    agentChat: "Agent Chat",
    selectAgent: "Select Agent",
    thinking: "Thinking...",
    copyCode: "Copy code",
    copied: "Copied!",
    clearChat: "Clear chat",
    quickActions: "Quick Actions",

    heroTitle: "Welcome to BBOS",
    heroSubtitle: "A desktop workbench for Buckyball DSA developers",
    openWorkspace: "Open Workspace",
    openWorkspaceHint: "Select the buckyball repo root that contains examples/",
    recentWorkspaces: "Recent Workspaces",
    noRecent: "No recent workspaces yet. Open a buckyball repo to get started.",
    newProject: "New Project",

    actionBuildCompiler: "Build Compiler",
    actionBuildWorkload: "Build Workload",
    actionRunVerilator: "Run Verilator",
    actionBuildUvm: "Build UVM",
    actionOpenDocs: "Open Docs",
    actionJoinCommunity: "Join Community",

    systemStatus: "System Status",
    bbdevDetected: "bbdev detected",
    bbdevMissing: "bbdev not found",
    nixReady: "Nix ready",
    nixMissing: "Nix missing",
    backendOnline: "Backend online",
    backendOffline: "Backend offline",
    checking: "Checking…",

    openedRelative: "Opened {when}",
    path: "Path",

    version: "Version {version}",
    docs: "Docs",
    feedback: "Feedback",
    shortcuts: "Shortcuts",
  },
} as const satisfies Record<Lang, Record<TranslationKey, string>>;

export type { TranslationKey };
export { translations };
