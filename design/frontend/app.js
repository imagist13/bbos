// =====================================================================
// ⚠️  DEPRECATED — DO NOT USE
// =====================================================================
// 此文件 (app.js) 已被 `index.html` 完全取代。
//
// index.html 现在是一个 2063 行的自包含文件（HTML + CSS + 完整 React
// 应用代码），合并了三栏布局、Chip/Design/Ball ISA 编辑器、Simulator
// 与 AI Assistant 面板，并统一了中英文 i18n 与明暗主题。
//
// 本文件保留仅作为历史参考，不被任何文件引用，未来版本将被移除。
// 新工作请基于 index.html 继续。
//
// 取代时间：2026-09-25
// 取代版本：v1.1
// 详见：bbos/design/SPEC.md 与 bbos/design/dev/DEV_PLAN.md
// =====================================================================

// Buckyball Studio - Modern Design System (LEGACY)
const { useState, useEffect, useRef, createContext, useContext } = React;

// ============================================
// Design Tokens (CSS Variables exposed for JS use)
// ============================================
const tokens = {
  colors: {
    primary: {
      50: '#e6f7f5', 100: '#b3e0d9', 200: '#80c9bd', 300: '#4db2a1',
      400: '#269b88', 500: '#00856f', 600: '#006d5a', 700: '#005545',
      800: '#003d30', 900: '#002620'
    },
    success: { 100: '#d1fae5', 500: '#10b981' },
    warning: { 100: '#fef3c7', 500: '#f59e0b' },
    danger: { 100: '#fee2e2', 500: '#ef4444' },
    info: { 100: '#dbeafe', 500: '#3b82f6' }
  }
};

// ============================================
// i18n - Translations
// ============================================
const translations = {
  zh: {
    appName: 'Buckyball Studio',
    workspace: '工作区',
    searchFiles: '搜索文件...',
    new: '新建',
    import: '导入',
    chip: '芯片',
    designs: '设计',
    ballIsa: 'Ball ISA',
    simulator: '仿真器',
    agent: 'AI 助手',
    chipConfig: '芯片配置',
    designConfig: '设计配置',
    ballIsaEditor: 'Ball ISA 编辑器',
    simControl: '仿真控制',
    ready: '准备就绪',
    running: '运行中',
    selectChip: '芯片',
    selectSimulator: '仿真器',
    selectBinary: '二进制文件',
    run: '运行',
    stop: '停止',
    quickCommands: '快捷命令',
    terminalOutput: '终端输出',
    save: '保存',
    saved: '已保存',
    instructions: '指令',
    mnemonic: '助记符',
    funct7: 'funct7',
    ballId: 'Ball ID',
    ball: 'Ball',
    actions: '操作',
    edit: '编辑',
  },
  en: {
    appName: 'Buckyball Studio',
    workspace: 'Workspace',
    searchFiles: 'Search files...',
    new: 'New',
    import: 'Import',
    chip: 'Chip',
    designs: 'Designs',
    ballIsa: 'Ball ISA',
    simulator: 'Simulator',
    agent: 'AI Assistant',
    chipConfig: 'Chip Configuration',
    designConfig: 'Design Configuration',
    ballIsaEditor: 'Ball ISA Editor',
    simControl: 'Simulation Control',
    ready: 'Ready',
    running: 'Running',
    selectChip: 'Chip',
    selectSimulator: 'Simulator',
    selectBinary: 'Binary',
    run: 'Run',
    stop: 'Stop',
    quickCommands: 'Quick Commands',
    terminalOutput: 'Terminal Output',
    save: 'Save',
    saved: 'Saved',
    instructions: 'instructions',
    mnemonic: 'Mnemonic',
    funct7: 'funct7',
    ballId: 'Ball ID',
    ball: 'Ball',
    actions: 'Actions',
    edit: 'Edit',
  }
};

// ============================================
// Mock Data
// ============================================
const MOCK_PROJECT = {
  name: 'workspace',
  path: '/path/to/buckyball',
  structure: [
    {
      name: 'examples',
      type: 'dir',
      children: [
        { name: 'chips', type: 'dir', children: [
          { name: 'toy', type: 'dir', children: [
            { name: 'arch', type: 'dir' },
            { name: 'configs', type: 'dir', children: [
              { name: 'chip.toml', type: 'file' },
              { name: 'designs', type: 'dir', children: [
                { name: 'toy.toml', type: 'file' },
              ]},
            ]},
            { name: 'workloads', type: 'dir' },
          ]},
          { name: 'pebble', type: 'dir' },
        ]},
        { name: 'cores', type: 'dir' },
      ]
    },
  ]
};

const MOCK_CHIP_CONFIG = {
  designs: { include: 'designs/toy.toml' },
  sims: {
    verilator: 'sims.verilator.BuckyballToyVerilatorConfig',
    p2e: 'sims.p2e.P2EToyLinuxConfig',
    firesim: 'sims.firesim.FireSimBuckyballToyConfig',
  },
  uvm: { balls: ['gemmini'], ips: ['axis'] }
};

const MOCK_BALL_ISA = [
  { mnemonic: 'GEMMINI_CONFIG', funct7: 2, bid: 0, ball: 'GemminiBall' },
  { mnemonic: 'GEMMINI_FLUSH', funct7: 3, bid: 0, ball: 'GemminiBall' },
  { mnemonic: 'GEMMINI_COMPUTE_PRELOADED', funct7: 66, bid: 0, ball: 'GemminiBall' },
  { mnemonic: 'BDB_COUNTER', funct7: 4, bid: 1, ball: 'TraceBall' },
  { mnemonic: 'RELU', funct7: 50, bid: 3, ball: 'ReluBall' },
  { mnemonic: 'MXFP2INT', funct7: 55, bid: 2, ball: 'Mxfp2IntBall' },
];

const SIMULATION_TEMPLATES = [
  { id: 'verilator', name: 'Verilator', desc: 'RTL simulation' },
  { id: 'bebop-verilator', name: 'Bebop Verilator', desc: 'Fast emulator + verilator' },
  { id: 'bemu', name: 'BEMU', desc: 'Bare metal emulator' },
  { id: 'p2e', name: 'P2E', desc: 'FPGA emulation' },
];

const BBDEV_COMMANDS = [
  { id: 'compiler-build', cmd: 'bbdev compiler --build', desc: 'Build Compiler' },
  { id: 'workload-build', cmd: 'bbdev workload --build', desc: 'Build Workload' },
  { id: 'verilator-run', cmd: 'bbdev verilator --run', desc: 'Run Verilator' },
  { id: 'uvm-build', cmd: 'bbdev uvm --build', desc: 'Build UVM' },
];

const CHIPS = ['toy', 'pebble', 'poly', 'goban'];
const BINARIES = [
  'toy-toy-vecunit_matmul_ones-baremetal',
  'toy-toy-vecunit_matmul_random-baremetal',
  'toy-toy-gemmini_matmul-baremetal',
];

// ============================================
// Icon Library (Lucide-style SVG)
// ============================================
const Icon = ({ name, size = 16, ...props }) => {
  const icons = {
    Folder: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
      </svg>
    ),
    File: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
    ),
    ChevronRight: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    ),
    ChevronDown: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    ),
    Play: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5 3 19 12 5 21 5 3"/>
      </svg>
    ),
    Square: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="6" width="12" height="12" rx="2"/>
      </svg>
    ),
    Terminal: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4 17 10 11 4 5"/>
        <line x1="12" y1="19" x2="20" y2="19"/>
      </svg>
    ),
    Save: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
    ),
    Settings: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    ),
    Cpu: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
        <rect x="9" y="9" width="6" height="6"/>
        <line x1="9" y1="1" x2="9" y2="4"/>
        <line x1="15" y1="1" x2="15" y2="4"/>
        <line x1="9" y1="20" x2="9" y2="23"/>
        <line x1="15" y1="20" x2="15" y2="23"/>
        <line x1="20" y1="9" x2="23" y2="9"/>
        <line x1="20" y1="14" x2="23" y2="14"/>
        <line x1="1" y1="9" x2="4" y2="9"/>
        <line x1="1" y1="14" x2="4" y2="14"/>
      </svg>
    ),
    Grid: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
    Zap: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    Search: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    Plus: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    ),
    Bot: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <circle cx="12" cy="5" r="2"/>
        <path d="M12 7v4"/>
        <line x1="8" y1="16" x2="8" y2="16"/>
        <line x1="16" y1="16" x2="16" y2="16"/>
      </svg>
    ),
    Send: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    ),
    Copy: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    ),
    Check: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
    ),
    X: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    ),
  };
  
  return icons[name] || null;
};

// ============================================
// Base Components
// ============================================

// Button Component
const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  onClick,
  icon,
  style = {}
}) => {
  const baseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontWeight: 500,
    borderRadius: 'var(--radius-md)',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all var(--transition-fast)',
    fontSize: size === 'sm' ? '12px' : '13px',
    padding: size === 'sm' ? '6px 12px' : '8px 16px',
    opacity: disabled ? 0.5 : 1,
    position: 'relative',
    overflow: 'hidden',
    ...style
  };
  
  const variants = {
    primary: {
      background: 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(0, 133, 111, 0.25)',
    },
    secondary: {
      background: 'var(--bg-card)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-default)',
      boxShadow: 'var(--shadow-xs)',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text-secondary)',
      border: '1px solid transparent',
    },
    danger: {
      background: 'linear-gradient(135deg, var(--danger-500) 0%, #dc2626 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
    },
    success: {
      background: 'linear-gradient(135deg, var(--success-500) 0%, #059669 100%)',
      color: '#ffffff',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
    },
  };
  
  const style = { ...baseStyle, ...variants[variant] };
  
  return (
    <button 
      style={style} 
      disabled={disabled} 
      onClick={onClick}
      onMouseEnter={e => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 133, 111, 0.35)';
          } else if (variant === 'secondary') {
            e.currentTarget.style.background = 'var(--bg-card-hover)';
            e.currentTarget.style.borderColor = 'var(--border-strong)';
          }
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        if (variant === 'primary') {
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 133, 111, 0.25)';
        } else if (variant === 'secondary') {
          e.currentTarget.style.background = 'var(--bg-card)';
          e.currentTarget.style.borderColor = 'var(--border-default)';
        }
      }}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children}
    </button>
  );
};

// Input Component
const Input = ({ 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  style = {},
  ...props 
}) => {
  const [focused, setFocused] = useState(false);
  
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        background: 'var(--bg-input)',
        border: `1px solid ${focused ? 'var(--primary-400)' : 'var(--border-default)'}`,
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        fontSize: '13px',
        outline: 'none',
        transition: 'all var(--transition-fast)',
        width: '100%',
        boxShadow: focused ? '0 0 0 3px rgba(0, 133, 111, 0.1)' : 'none',
        ...style,
      }}
      {...props}
    />
  );
};

// Select Component
const Select = ({ value, onChange, options, style = {} }) => {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        color: 'var(--text-primary)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 14px',
        paddingRight: '36px',
        fontSize: '13px',
        outline: 'none',
        cursor: 'pointer',
        transition: 'all var(--transition-fast)',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        ...style,
      }}
    >
      {options.map(opt => (
        <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
          {typeof opt === 'string' ? opt : opt.label}
        </option>
      ))}
    </select>
  );
};

// Badge Component
const Badge = ({ children, variant = 'default', style = {} }) => {
  const variants = {
    default: { 
      background: 'var(--slate-100)', 
      color: 'var(--slate-600)',
      border: '1px solid var(--slate-200)'
    },
    success: { 
      background: 'var(--success-100)', 
      color: '#059669',
      border: '1px solid #a7f3d0'
    },
    warning: { 
      background: 'var(--warning-100)', 
      color: '#b45309',
      border: '1px solid #fde68a'
    },
    danger: { 
      background: 'var(--danger-100)', 
      color: '#dc2626',
      border: '1px solid #fecaca'
    },
    info: { 
      background: 'var(--info-100)', 
      color: '#1d4ed8',
      border: '1px solid #bfdbfe'
    },
    primary: {
      background: 'var(--primary-100)',
      color: 'var(--primary-700)',
      border: '1px solid var(--primary-200)'
    }
  };
  
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 10px',
      borderRadius: 'var(--radius-full)',
      fontSize: '11px',
      fontWeight: 500,
      letterSpacing: '0.01em',
      ...variants[variant],
      ...style,
    }}>
      {children}
    </span>
  );
};

// Card Component
const Card = ({ 
  children, 
  padding = true, 
  hover = false,
  style = {},
  className = ''
}) => {
  return (
    <div 
      className={className}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: padding ? '20px' : 0,
        boxShadow: 'var(--shadow-sm)',
        transition: 'all var(--transition-base)',
        ...style,
      }}
      onMouseEnter={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-md)';
        e.currentTarget.style.borderColor = 'var(--border-default)';
      } : undefined}
      onMouseLeave={hover ? e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        e.currentTarget.style.borderColor = 'var(--border-subtle)';
      } : undefined}
    >
      {children}
    </div>
  );
};

// Divider Component
const Divider = ({ style = {} }) => (
  <div style={{ 
    height: '1px', 
    background: 'linear-gradient(90deg, transparent, var(--border-default), transparent)',
    margin: '20px 0',
    ...style 
  }} />
);

// ============================================
// Layout Components
// ============================================

// Sidebar Component
const Sidebar = ({ project, onSelectFile, selectedFile, t }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'relative',
    }}>
      {/* Gradient overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(180deg, rgba(0, 133, 111, 0.15) 0%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      
      {/* Header */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          marginBottom: '12px',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary-400) 0%, var(--primary-500) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0, 133, 111, 0.3)',
          }}>
            <Icon name="Cpu" size={16} style={{ color: '#ffffff' }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#f8fafc' }}>
              {project.name}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.5)' }}>
              Buckyball
            </div>
          </div>
        </div>
        
        {/* Search */}
        <div style={{
          position: 'relative',
        }}>
          <Icon 
            name="Search" 
            size={14} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.4)',
            }} 
          />
          <input
            placeholder={t('searchFiles')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px 8px 36px',
              fontSize: '12px',
              color: '#f8fafc',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        </div>
      </div>
      
      {/* File Tree */}
      <div style={{ 
        flex: 1, 
        overflow: 'auto', 
        padding: '12px 8px',
      }}>
        <TreeView data={[project.structure[0]]} onSelect={onSelectFile} selected={selectedFile} />
      </div>
      
      {/* Footer Actions */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        gap: '8px',
      }}>
        <Button variant="primary" size="sm" icon="Plus" style={{ flex: 1 }}>
          {t('new')}
        </Button>
        <Button variant="ghost" size="sm" style={{ flex: 1, color: 'rgba(255, 255, 255, 0.7)' }}>
          {t('import')}
        </Button>
      </div>
    </aside>
  );
};

// TreeView Component
const TreeItem = ({ item, path, level = 0, selected, onSelect }) => {
  const [expanded, setExpanded] = useState(level < 2);
  const isDir = item.type === 'dir';
  const isSelected = selected === path;
  
  return (
    <div>
      <div
        onClick={() => {
          if (isDir) setExpanded(!expanded);
          if (!isDir) onSelect(item, path);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          paddingLeft: `${12 + level * 16}px`,
          cursor: 'pointer',
          borderRadius: 'var(--radius-md)',
          background: isSelected ? 'rgba(0, 133, 111, 0.2)' : 'transparent',
          color: isSelected ? 'var(--primary-300)' : 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          transition: 'all var(--transition-fast)',
          marginBottom: '2px',
        }}
        onMouseEnter={e => {
          if (!isSelected) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            e.currentTarget.style.color = '#f8fafc';
          }
        }}
        onMouseLeave={e => {
          if (!isSelected) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
          }
        }}
      >
        <span style={{ 
          color: isSelected ? 'var(--primary-400)' : 'rgba(255, 255, 255, 0.4)',
          display: 'flex',
          alignItems: 'center',
        }}>
          {isDir ? (expanded ? <Icon name="ChevronDown" size={12} /> : <Icon name="ChevronRight" size={12} />) : null}
        </span>
        <span style={{ 
          color: isSelected ? 'var(--primary-400)' : isDir ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
          display: 'flex',
          alignItems: 'center',
        }}>
          {isDir ? <Icon name="Folder" size={14} /> : <Icon name="File" size={14} />}
        </span>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </span>
        {!isDir && item.name.endsWith('.toml') && (
          <Badge variant="primary" style={{ fontSize: '9px', padding: '1px 6px' }}>
            TOML
          </Badge>
        )}
      </div>
      {isDir && expanded && item.children && (
        <div style={{ animation: 'slideIn 0.2s ease-out' }}>
          {item.children.map((child, i) => (
            <TreeItem 
              key={i} 
              item={child} 
              path={`${path}/${child.name}`} 
              level={level + 1} 
              selected={selected} 
              onSelect={onSelect} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TreeView = ({ data, onSelect, selected }) => (
  <div style={{ padding: '4px 0' }}>
    {data.map((item, i) => (
      <TreeItem key={i} item={item} path={item.name} level={0} selected={selected} onSelect={onSelect} />
    ))}
  </div>
);

// Tab Navigation Component
const TabNav = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      padding: '4px',
      background: 'var(--slate-100)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
    }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            transition: 'all var(--transition-fast)',
            background: activeTab === tab.id 
              ? 'var(--bg-elevated)' 
              : 'transparent',
            color: activeTab === tab.id 
              ? 'var(--text-primary)' 
              : 'var(--text-secondary)',
            boxShadow: activeTab === tab.id 
              ? 'var(--shadow-sm)' 
              : 'none',
          }}
          onMouseEnter={e => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
            }
          }}
          onMouseLeave={e => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.background = 'transparent';
            }
          }}
        >
          <Icon name={tab.icon} size={16} />
          {tab.label}
        </button>
      ))}
    </div>
  );
};

// ============================================
// Page Components
// ============================================

// Chip Editor Page
const ChipEditorPage = ({ config, t }) => {
  const [data, setData] = useState(config);
  const [saved, setSaved] = useState(false);
  
  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.chipConfig}
            </h1>
            <Badge variant="info">chip.toml</Badge>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure simulation targets and UVM settings
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saved && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: 'var(--success-500)',
              fontSize: '13px',
              fontWeight: 500,
              animation: 'fadeIn 0.2s ease-out',
            }}>
              <Icon name="Check" size={14} />
              {t.saved}
            </div>
          )}
          <Button onClick={handleSave} icon="Save">
            {t.save}
          </Button>
        </div>
      </div>
      
      {/* Design Include Section */}
      <Card hover style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary-100) 0%, var(--primary-200) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="Grid" size={18} style={{ color: 'var(--primary-600)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>
              Design Configuration
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Link to your design TOML file
            </p>
          </div>
        </div>
        <div style={{ maxWidth: '500px' }}>
          <label style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: 'var(--text-secondary)', 
            display: 'block', 
            marginBottom: '8px' 
          }}>
            Design File Path
          </label>
          <Input 
            value={data.designs.include} 
            style={{ fontFamily: "'JetBrains Mono', monospace" }}
          />
        </div>
      </Card>
      
      {/* Simulation Targets */}
      <Card hover style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--slate-200) 0%, var(--slate-300) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="Terminal" size={18} style={{ color: 'var(--slate-600)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>
              Simulation Targets
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Available simulation backends
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gap: '12px', maxWidth: '600px' }}>
          {Object.entries(data.sims).map(([key, value]) => (
            <div key={key}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: 500, 
                color: 'var(--text-secondary)', 
                display: 'block', 
                marginBottom: '6px',
                textTransform: 'capitalize',
              }}>
                {key}
              </label>
              <Input 
                value={value} 
                style={{ 
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '12px',
                }}
              />
            </div>
          ))}
        </div>
      </Card>
      
      {/* UVM Config */}
      <Card hover>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--success-100) 0%, #a7f3d0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="Check" size={18} style={{ color: 'var(--success-500)' }} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '2px' }}>
              UVM Configuration
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Verification components to include
            </p>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '500px' }}>
          <div>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              Balls
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {data.uvm.balls.map(ball => (
                <Badge key={ball} variant="primary">{ball}</Badge>
              ))}
            </div>
          </div>
          <div>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              IPs
            </label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {data.uvm.ips.map(ip => (
                <Badge key={ip}>{ip}</Badge>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Ball ISA Editor Page
const BallISAPage = ({ data: rawData, t }) => {
  const [instructions] = useState(rawData);
  const [filter, setFilter] = useState('');
  const [selectedBall, setSelectedBall] = useState('all');
  
  const balls = [...new Set(rawData.map(i => i.ball))];
  const filtered = instructions.filter(i => {
    const matchFilter = i.mnemonic.toLowerCase().includes(filter.toLowerCase());
    const matchBall = selectedBall === 'all' || i.ball === selectedBall;
    return matchFilter && matchBall;
  });
  
  const ballCounts = balls.reduce((acc, ball) => {
    acc[ball] = instructions.filter(i => i.ball === ball).length;
    return acc;
  }, {});
  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '24px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.ballIsaEditor}
            </h1>
            <Badge variant="primary">{filtered.length}</Badge>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            View and manage Ball ISA instructions
          </p>
        </div>
        <Button icon="Plus">
          Add Instruction
        </Button>
      </div>
      
      {/* Filters */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginBottom: '20px',
        alignItems: 'center',
      }}>
        <div style={{
          flex: 1,
          maxWidth: '320px',
          position: 'relative',
        }}>
          <Icon 
            name="Search" 
            size={14} 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }} 
          />
          <input
            placeholder="Search instructions..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px 10px 38px',
              fontSize: '13px',
              color: 'var(--text-primary)',
              outline: 'none',
              transition: 'all var(--transition-fast)',
            }}
          />
        </div>
        <Select
          value={selectedBall}
          onChange={e => setSelectedBall(e.target.value)}
          options={[{ value: 'all', label: 'All Balls' }, ...balls.map(b => ({ value: b, label: b }))]}
          style={{ width: '160px' }}
        />
      </div>
      
      {/* Ball Filter Pills */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {balls.map(ball => (
          <button
            key={ball}
            onClick={() => setSelectedBall(selectedBall === ball ? 'all' : ball)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: selectedBall === ball 
                ? 'linear-gradient(135deg, var(--primary-500) 0%, var(--primary-600) 100%)'
                : 'var(--bg-card)',
              border: `1px solid ${selectedBall === ball ? 'var(--primary-500)' : 'var(--border-default)'}`,
              color: selectedBall === ball ? '#ffffff' : 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              boxShadow: selectedBall === ball ? '0 2px 8px rgba(0, 133, 111, 0.3)' : 'var(--shadow-xs)',
            }}
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: selectedBall === ball ? '#ffffff' : 'var(--primary-400)',
            }} />
            {ball}
            <Badge 
              variant={selectedBall === ball ? 'default' : 'default'}
              style={{
                background: selectedBall === ball ? 'rgba(255,255,255,0.2)' : 'var(--slate-100)',
                color: selectedBall === ball ? '#ffffff' : 'var(--text-secondary)',
                border: 'none',
              }}
            >
              {ballCounts[ball]}
            </Badge>
          </button>
        ))}
      </div>
      
      {/* Instructions Table */}
      <Card padding={false} style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--slate-50)' }}>
              <th style={{ 
                textAlign: 'left', 
                padding: '14px 20px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {t.mnemonic}
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '14px 20px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {t.funct7}
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '14px 20px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {t.ballId}
              </th>
              <th style={{ 
                textAlign: 'left', 
                padding: '14px 20px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-subtle)',
              }}>
                {t.ball}
              </th>
              <th style={{ 
                textAlign: 'right', 
                padding: '14px 20px', 
                fontSize: '11px', 
                fontWeight: 600, 
                color: 'var(--text-muted)', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em',
                borderBottom: '1px solid var(--border-subtle)',
                width: '100px',
              }}>
                {t.actions}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inst, i) => (
              <tr 
                key={i} 
                style={{ 
                  borderBottom: '1px solid var(--border-subtle)',
                  transition: 'background var(--transition-fast)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--slate-50)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '14px 20px' }}>
                  <code style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '12px',
                    color: 'var(--primary-600)',
                    background: 'var(--primary-50)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                  }}>
                    {inst.mnemonic}
                  </code>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <code style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                  }}>
                    {inst.funct7}
                  </code>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Badge variant="default">{inst.bid}</Badge>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <Badge variant="primary">{inst.ball}</Badge>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <Button variant="ghost" size="sm">
                    {t.edit}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

// Simulator Page
const SimulatorPage = ({ t }) => {
  const [selectedChip, setSelectedChip] = useState('toy');
  const [selectedSim, setSelectedSim] = useState('verilator');
  const [selectedBinary, setSelectedBinary] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState([]);
  const terminalRef = useRef(null);
  
  const runCommand = (cmd) => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    
    const mockLogs = [
      { type: 'info', text: `[${timestamp()}] Starting: ${cmd} --chip ${selectedChip}` },
      { type: 'info', text: `[${timestamp()}] Resolving paths from chip.toml...` },
      { type: 'info', text: `[${timestamp()}] Loading design: designs/${selectedChip}.toml` },
      { type: 'success', text: `[${timestamp()}] ✓ Environment ready` },
      { type: 'info', text: `[${timestamp()}] Executing: ${cmd}` },
      { type: 'info', text: '>>> Running simulation...' },
      { type: 'info', text: '>>> [Progress: 25%] Loading binary...' },
      { type: 'info', text: '>>> [Progress: 50%] Initializing tiles...' },
      { type: 'info', text: '>>> [Progress: 75%] Running test...' },
      { type: 'success', text: `[${timestamp()}] ✓ Simulation completed successfully` },
      { type: 'info', text: `[${timestamp()}] Exit code: 0` },
      { type: 'info', text: `[${timestamp()}] Waveform saved: target/${selectedChip}/sim.vcd` },
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      if (index < mockLogs.length) {
        setLogs(prev => [...prev, mockLogs[index]]);
        index++;
      } else {
        clearInterval(interval);
        setIsRunning(false);
      }
    }, 400);
  };
  
  const stopSimulation = () => {
    setIsRunning(false);
    setLogs(prev => [...prev, { type: 'warning', text: '>>> Simulation stopped by user' }]);
  };
  
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);
  
  const logColors = {
    info: '#9ca3af',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  };
  
  return (
    <div style={{ animation: 'fadeIn 0.3s ease-out', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {t.simControl}
            </h1>
            <Badge variant={isRunning ? 'warning' : 'success'}>
              {isRunning ? t.running : t.ready}
            </Badge>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Run simulations and view results
          </p>
        </div>
      </div>
      
      {/* Control Panel */}
      <Card style={{ marginBottom: '16px' }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          alignItems: 'end',
        }}>
          <div>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              {t.selectChip}
            </label>
            <Select 
              value={selectedChip} 
              onChange={e => setSelectedChip(e.target.value)} 
              options={CHIPS}
              disabled={isRunning}
            />
          </div>
          
          <div>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              {t.selectSimulator}
            </label>
            <Select 
              value={selectedSim} 
              onChange={e => setSelectedSim(e.target.value)} 
              options={SIMULATION_TEMPLATES.map(s => ({ value: s.id, label: `${s.name} — ${s.desc}` }))}
              disabled={isRunning}
            />
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ 
              fontSize: '12px', 
              fontWeight: 500, 
              color: 'var(--text-secondary)', 
              display: 'block', 
              marginBottom: '8px' 
            }}>
              {t.selectBinary}
            </label>
            <Select 
              value={selectedBinary} 
              onChange={e => setSelectedBinary(e.target.value)}
              options={[{ value: '', label: 'Select a binary...' }, ...BINARIES]}
              disabled={isRunning}
            />
          </div>
          
          <Button 
            variant={isRunning ? 'danger' : 'success'}
            icon={isRunning ? 'Square' : 'Play'}
            onClick={() => isRunning ? stopSimulation() : runCommand(`bbdev ${selectedSim} --run`)}
            disabled={!selectedBinary && !isRunning}
            style={{ minWidth: '100px' }}
          >
            {isRunning ? t.stop : t.run}
          </Button>
        </div>
      </Card>
      
      {/* Quick Commands */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ 
          fontSize: '11px', 
          fontWeight: 600, 
          color: 'var(--text-muted)', 
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          {t.quickCommands}
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {BBDEV_COMMANDS.map(cmd => (
            <button
              key={cmd.id}
              onClick={() => runCommand(cmd.cmd)}
              disabled={isRunning}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.5 : 1,
                transition: 'all var(--transition-fast)',
                boxShadow: 'var(--shadow-xs)',
              }}
              onMouseEnter={e => {
                if (!isRunning) {
                  e.currentTarget.style.borderColor = 'var(--primary-400)';
                  e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-default)';
                e.currentTarget.style.boxShadow = 'var(--shadow-xs)';
              }}
            >
              {cmd.desc}
            </button>
          ))}
        </div>
      </div>
      
      {/* Terminal */}
      <Card 
        padding={false} 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minHeight: '300px',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: '#9ca3af', 
            fontSize: '12px',
            fontWeight: 500,
          }}>
            <Icon name="Terminal" size={14} />
            {t.terminalOutput}
          </div>
          <button
            onClick={() => setLogs([])}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#6b7280',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              transition: 'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = '#9ca3af';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            Clear
          </button>
        </div>
        <div
          ref={terminalRef}
          style={{
            flex: 1,
            padding: '16px',
            overflow: 'auto',
            background: 'var(--bg-terminal)',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '12px',
            lineHeight: 1.7,
          }}
        >
          {logs.length === 0 ? (
            <div style={{ 
              color: '#4b5563', 
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              textAlign: 'center',
            }}>
              <Icon name="Terminal" size={32} style={{ color: '#374151', marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', marginBottom: '4px' }}>
                Ready to run simulation
              </div>
              <div style={{ fontSize: '11px', color: '#6b7280' }}>
                Select chip, simulator, and binary to begin
              </div>
            </div>
          ) : (
            logs.map((log, i) => (
              <div 
                key={i} 
                style={{ 
                  color: logColors[log.type] || logColors.info,
                  marginBottom: '2px',
                  animation: i === logs.length - 1 ? 'fadeIn 0.2s ease-out' : 'none',
                }}
              >
                {log.text}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

// ============================================
// Main App
// ============================================
const App = () => {
  const [activeTab, setActiveTab] = useState('chip');
  const [selectedFile, setSelectedFile] = useState('');
  
  const tabs = [
    { id: 'chip', label: translations.zh.chip, icon: 'Settings' },
    { id: 'ball', label: translations.zh.ballIsa, icon: 'Zap' },
    { id: 'sim', label: translations.zh.simulator, icon: 'Terminal' },
  ];
  
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-base)',
    }}>
      {/* Sidebar */}
      <Sidebar 
        project={MOCK_PROJECT} 
        onSelectFile={(item, path) => setSelectedFile(path)}
        selectedFile={selectedFile}
        t={translations.zh}
      />
      
      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <header style={{
          padding: '20px 28px',
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <TabNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              background: 'var(--slate-100)',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              color: 'var(--text-secondary)',
            }}>
              <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: 'var(--success-500)',
                boxShadow: '0 0 8px var(--success-500)',
              }} />
              Nix Ready
            </div>
          </div>
        </header>
        
        {/* Content Area */}
        <main style={{
          flex: 1,
          overflow: 'auto',
          padding: '28px',
        }}>
          {activeTab === 'chip' && (
            <ChipEditorPage config={MOCK_CHIP_CONFIG} t={translations.zh} />
          )}
          {activeTab === 'ball' && (
            <BallISAPage data={MOCK_BALL_ISA} t={translations.zh} />
          )}
          {activeTab === 'sim' && (
            <SimulatorPage t={translations.zh} />
          )}
        </main>
      </div>
    </div>
  );
};

// Helper function
const timestamp = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour12: false });
};

// Render
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
