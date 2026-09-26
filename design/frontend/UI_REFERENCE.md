# ECOS Studio UI Design Analysis

## 1. Design System Overview

ECOS Studio 采用现代化、专业化的设计语言，适合 EDA 工具类桌面应用。

### 1.1 Color Palette

#### Light Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#fdfdfc` | 主背景 |
| `--bg-secondary` | `#f4f6f6` | 次级背景、卡片 |
| `--bg-sidebar` | `#eef2f1` | 侧边栏背景 |
| `--border-color` | `#d9e0e0` | 边框颜色 |
| `--text-primary` | `#20292f` | 主要文本 |
| `--text-secondary` | `#5d6972` | 次要文本 |
| `--accent-color` | `#009c83` | 强调色（青绿色） |
| `--accent-text` | `#f8fffd` | 强调色文字 |

#### Dark Mode
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#18181c` | 主背景 |
| `--bg-secondary` | `#222226` | 次级背景 |
| `--bg-sidebar` | `#222226` | 侧边栏背景 |
| `--border-color` | `#52525b` | 边框颜色 |
| `--text-primary` | `#e3e3e8` | 主要文本 |
| `--text-secondary` | `#a1a1aa` | 次要文本 |
| `--accent-color` | `#00bfa5` | 强调色（亮青绿） |

#### Semantic Status Colors
| Status | Light Color | Light Background | Dark Color | Dark Background |
|--------|-------------|------------------|------------|-----------------|
| Info | `#2679b9` | `#e7f2fb` | `#60a5fa` | `rgba(96,165,250,0.15)` |
| Success | `#07866f` | `rgba(7,134,111,0.12)` | `#34d399` | `rgba(52,211,153,0.15)` |
| Warning | `#b76b08` | `rgba(183,107,8,0.12)` | `#fbbf24` | `rgba(251,191,36,0.12)` |
| Danger | `#be3b36` | `#fdf0ef` | `#f87171` | `rgba(248,113,113,0.12)` |

### 1.2 Typography

```css
font-family: 'Inter Variable', Inter, 'Noto Sans SC', 'Microsoft YaHei', 'PingFang SC', system-ui, Avenir, Helvetica, Arial, sans-serif;
line-height: 1.5;
font-weight: 400; /* body */
```

| Element | Size | Weight | Line Height |
|---------|------|--------|------------|
| Eyebrow label | 11px | 700 | - |
| Small text | 12px | 400 | 1.5 |
| Body | 13px | 400 | 1.5 |
| Default | 14px | 400 | 1.5 |
| Heading | 15px | 600 | - |
| Dialog title | 19px | 750 | - |
| Page title | 24-32px | 700 | 1.2 |

### 1.3 Spacing System

基于 4px 基准单位：
- `4px` - 微间距
- `8px` - 小间距
- `10px` - 输入框内边距
- `12px` - 小组件内边距
- `14px` - 列表项内边距
- `16px` - 组件内边距
- `20px` - 区块间距
- `22-24px` - 对话框内边距
- `28px` - 大区块内边距

### 1.4 Border Radius

| Element | Radius |
|---------|--------|
| Buttons | `4px` / `6px` |
| Inputs | `6px` |
| Cards | `8px` |
| Dialogs | `8px` / `12px` / `14px` |
| Dropdowns | `8px` |
| Pills/Badges | `9999px` (full) |

### 1.5 Shadows

```css
/* Card shadow */
box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);

/* Dropdown shadow */
box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);

/* Dialog shadow */
box-shadow: 0 26px 70px rgba(0,0,0,0.42);
```

### 1.6 Transitions

```css
transition: color 0.15s, background-color 0.15s, border-color 0.15s;
transition: opacity 0.15s ease, transform 0.15s ease; /* dropdowns */
```

---

## 2. Component Specifications

### 2.1 TopBar

**Structure:**
- Height: `40px`
- Left: App icon (28x28) + Menu items
- Center: Project name (if workspace open)
- Right: Window controls

**Menu Button:**
- Padding: `0 10px`
- Height: `100%`
- Hover: `color: var(--text-primary)`, `background: var(--bg-secondary)`

**Window Control Buttons:**
- Width: `46px` (close button: full width)
- Close hover: `background: #e81163; color: white`

### 2.2 Cards

**Default Card:**
```css
background: var(--bg-secondary);
border: 1px solid var(--border-color);
border-radius: 8px;
padding: 20px;
```

**Hover State:**
```css
box-shadow: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.04);
border-color: var(--accent-color);
```

### 2.3 Buttons

**Primary Button:**
```css
background: var(--accent-color);
color: #fff;
border-radius: 6px;
padding: 8px 16px;
font-size: 13px;
font-weight: 650;
```

**Secondary Button:**
```css
background: var(--bg-secondary);
border: 1px solid var(--border-color);
color: var(--text-primary);
```

**Ghost Button:**
```css
background: transparent;
border: 1px solid transparent;
color: var(--text-secondary);
```

**Hover Effects:**
```css
background: rgba(0,156,131,0.08); /* primary hover */
border-color: var(--accent-color); /* secondary hover */
```

### 2.4 Input Fields

**Text Input:**
```css
background: var(--bg-primary);
border: 1px solid var(--border-color);
border-radius: 6px;
padding: 8px 12px;
font-size: 13px;
```

**Focus State:**
```css
border-color: var(--accent-color);
box-shadow: 0 0 0 3px rgba(0,156,131,0.12);
```

### 2.5 Dropdown Menu

```css
background: var(--bg-secondary);
border: 1px solid var(--border-color);
border-radius: 8px;
box-shadow: 0 8px 24px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
padding: 4px;
```

**Menu Item:**
- Padding: `6px 12px`
- Font size: `13px`
- Gap: `10px` (icon to text)
- Hover: `background: var(--accent-color); color: #fff`

### 2.6 Badges/Pills

```css
padding: 2px 10px;
border-radius: 9999px;
font-size: 11px;
font-weight: 500;
```

### 2.7 Modal Dialog

```css
background: var(--bg-primary);
border: 1px solid var(--border-color);
border-radius: 14px;
box-shadow: 0 26px 70px rgba(0,0,0,0.42);
padding: 22px;
```

**Max width:** `min(460px, 100%)` for standard, `min(1440px, calc(100vw - 32px))` for large

---

## 3. Layout Patterns

### 3.1 Main Application Layout

```
┌─────────────────────────────────────────────────┐
│ TopBar (40px)                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│ Content Area (flex: 1)                          │
│                                                 │
├─────────────────────────────────────────────────┤
│ StatusBar (24px)                                │
└─────────────────────────────────────────────────┘
```

### 3.2 Welcome View Layout

```
┌─────────────────────────────────────────────────┐
│ TopBar                                          │
├─────────────────────────────────────────────────┤
│                                                 │
│     ┌─────────────────────────────────┐         │
│     │         Logo + Title             │         │
│     │                                 │         │
│     │  ┌─────────┐  ┌─────────┐       │         │
│     │  │ FE Tool │  │ BE Tool │       │         │
│     │  └─────────┘  └─────────┘       │         │
│     │                                 │         │
│     │  ┌────┐ ┌────┐ ┌────┐ ┌────┐  │         │
│     │  │Link│ │Link│ │Link│ │Link│  │         │
│     │  └────┘ └────┘ └────┘ └────┘  │         │
│     │                                 │         │
│     │  ┌─────────────────────────┐    │         │
│     │  │   Command Tools Card    │    │         │
│     │  └─────────────────────────┘    │         │
│     │                                 │         │
│     │  ┌─ Project Management ────┐     │         │
│     │  └─────────────────────────┘    │         │
│     └─────────────────────────────────┘         │
│                                                 │
├─────────────────────────────────────────────────┤
│ StatusBar                                       │
└─────────────────────────────────────────────────┘
```

### 3.3 Projects View Layout

```
┌─────────────────────────────────────────────────┐
│ TopBar                                          │
├────────────┬────────────────────────────────────┤
│            │                                    │
│  Sidebar   │       Main Panel                   │
│  (280px)   │                                    │
│            │   ┌────────────────────────────┐    │
│  ┌──────┐  │   │   Project Analysis        │    │
│  │Search│  │   │   Tabs: Dashboard | Step  │    │
│  └──────┘  │   │                            │    │
│            │   │   ┌────────────────────┐   │    │
│  Projects  │   │   │   Charts/Tables    │   │    │
│  ├ proj1  │  │   │                    │   │    │
│  │ └ ws1  │  │   │                    │   │    │
│  │ └ ws2  │  │   └────────────────────┘   │    │
│  ├ proj2  │  │                            │    │
│  └ proj3  │   └────────────────────────────┘    │
│            │                                    │
├────────────┴────────────────────────────────────┤
│ StatusBar                                       │
└─────────────────────────────────────────────────┘
```

---

## 4. Icon System

使用 Remix Icon (remixicon.com)，通过 `<i class="ri-xxx"></i>` 使用：

| Category | Icons |
|----------|-------|
| Navigation | `ri-arrow-right-s-line`, `ri-arrow-down-s-line`, `ri-arrow-right-up-line` |
| File | `ri-folder-open-line`, `ri-file-add-line`, `ri-file-chart-line` |
| Actions | `ri-add-line`, `ri-settings-3-line`, `ri-refresh-line` |
| Windows | `ri-minimize`, `ri-expand-diagonal-line`, `ri-close-line` |
| Theme | `ri-sun-line`, `ri-moon-line` |
| Status | `ri-check-line`, `ri-error-warning-line`, `ri-information-line` |
| Categories | `ri-code-s-slash-line`, `ri-cpu-line`, `ri-tools-line`, `ri-layout-grid-line` |

---

## 5. Animations & Transitions

### 5.1 Dropdown Animation

```css
.dropdown-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
```

### 5.2 Loading Spinner

```css
.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--border-color);
  border-top-color: var(--accent-color);
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### 5.3 Card Hover

```css
transition: all 0.2s ease;
transform: scale(1.02); /* optional scale effect */
```

---

## 6. Dark Mode Support

通过 `.dark` class 切换：

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* 系统偏好自动应用 */
  }
}

.dark {
  --bg-primary: #18181c;
  --bg-secondary: #222226;
  --text-primary: #e3e3e8;
  /* ... */
}
```

---

## 7. Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--text-secondary) 18%, transparent);
  border-radius: 9999px;
}
*:hover::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--text-secondary) 36%, transparent);
}
```

---

## 8. Key Design Principles

1. **Professional & Minimal**: 避免过度装饰，保持界面干净
2. **Consistent Spacing**: 严格的 4px 基准网格
3. **Subtle Depth**: 使用微妙的阴影和边框，而非强阴影
4. **Accent Color Focus**: 青绿色作为唯一强调色
5. **Dark Mode First**: 深色模式下同样精心设计
6. **Accessible**: 足够的对比度，清晰的状态颜色
7. **Performance**: 滚动条、动画等细节优化性能

---

## 9. Tailwind CSS Classes Used

| Class | Equivalent |
|-------|------------|
| `flex` | `display: flex` |
| `flex-col` | `flex-direction: column` |
| `items-center` | `align-items: center` |
| `justify-center` | `justify-content: center` |
| `justify-between` | `justify-content: space-between` |
| `gap-2/3/4` | `gap: 8/12/16px` |
| `p-2/3/4/6/8` | `padding: 8/12/16/24/32px` |
| `m-2/4/6` | `margin: 8/16/24px` |
| `rounded-lg` | `border-radius: 8px` |
| `rounded-full` | `border-radius: 9999px` |
| `border` | `border: 1px solid` |
| `text-xs/sm/base/lg` | `font-size: 12/13/14/18px` |
| `font-medium/semibold/bold` | `font-weight: 500/600/700` |
| `uppercase` | `text-transform: uppercase` |
| `tracking-wide` | `letter-spacing: 0.025em` |
| `shadow-lg` | `box-shadow: 0 10px 15px -3px` |

---

## 10. Implementation Recommendations for Buckyball Studio

### 10.1 Color Adoption

```css
/* Adopt ECOS color scheme */
--bg-primary: #fdfdfc;
--bg-secondary: #f4f6f6;
--accent-color: #009c83;
--text-primary: #20292f;
--text-secondary: #5d6972;
```

### 10.2 Typography Adoption

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans SC', sans-serif;
```

### 10.3 Component Improvements

1. **Cards**: 统一使用 8px radius，添加 hover 阴影
2. **Buttons**: 统一使用 6px radius，保持 650 weight
3. **Inputs**: 添加 focus ring
4. **Badges**: 使用 9999px radius
5. **Spacing**: 统一使用 4px 倍数

### 10.4 Layout Improvements

1. 添加 TopBar 结构
2. 使用更宽松的 padding
3. 添加 StatusBar
4. 改进导航结构
