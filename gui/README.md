# Project Wind - Tauri JS Starter Kit

A modern, professional desktop application starter template built with Tauri, React 18, TypeScript, and Shadcn UI. Features a custom title bar, responsive navigation, and comprehensive UI component showcase.

## ✨ Features

### Core Technologies
- ⚡ **Tauri** - Build smaller, faster, more secure desktop applications
- ⚛️ **React 18** - Modern React with hooks and concurrent features
- 📘 **TypeScript** - Full type safety across the entire application
- 🎨 **Shadcn UI** - 52+ beautiful, accessible UI components
- 🎯 **Vite** - Lightning-fast development with HMR
- 💅 **TailwindCSS** - Utility-first CSS framework

### Custom Features
- 🪟 **Custom Title Bar** - Native-like window controls (minimize, maximize, close)
- 🎨 **Theme System** - Light/Dark/System modes with live switching
- 📱 **Responsive Design** - Mobile-first approach with breakpoint handling
- 🍔 **Smart Navigation** - Hamburger menu on mobile, menubar on desktop
- 🎭 **Modern Animations** - Smooth transitions and interactive elements
- 🏗️ **Clean Architecture** - Pages, layouts, and components separation

## Quick Start

### Prerequisites

- Node.js v18+
- Rust (latest stable)
- npm/yarn/pnpm


### Installation using CLI

```bash
npm create tauri-app-project-wind@latest

# Install dependencies
npm install

# Run development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## 📁 Project Structure

```
project-wind/
├── src/
│   ├── components/
│   │   ├── ui/                 # 52+ Shadcn UI components
│   │   ├── demo/               # Component showcase
│   │   ├── TitleBar.tsx        # Custom window controls
│   │   └── theme-provider.tsx  # Theme context
│   ├── layouts/
│   │   └── MainLayout.tsx      # Main app layout wrapper
│   ├── pages/
│   │   └── Welcome.tsx         # Welcome/demo page
│   ├── lib/
│   │   └── utils.ts            # Utility functions
│   ├── main.tsx                # React entry point
│   └── styles.css              # Global styles
├── src-tauri/
│   ├── src/main.rs             # Rust backend
│   ├── tauri.conf.json         # Tauri configuration
│   └── Cargo.toml              # Rust dependencies
└── package.json                # Node dependencies
```

## 🚀 Available Scripts

```bash
# Development
npm run dev              # Start Vite dev server (web preview)
npm run tauri dev        # Run Tauri app in development mode

# Build
npm run build            # Build frontend for production
npm run tauri build      # Build complete desktop application

# Code Quality
npm run format           # Format code with Prettier
npx tsc --noEmit        # Type check without emitting files
```

## 🎯 Key Features Explained

### Custom Title Bar
A fully custom window control system that provides:
- **Native-like Controls** - Minimize, maximize/restore, close
- **Draggable Area** - Click and drag to move window
- **Theme Toggle** - Quick access theme switcher with icon
- **Responsive Menu** - Smart navigation that adapts to screen size

### Responsive Navigation
**Desktop (≥768px)**
- Traditional menubar with File, Edit, View, Help menus
- Theme options in View menu
- Keyboard shortcuts dialog

**Mobile (<768px)**
- Modern hamburger icon with smooth animation
- Sheet-based slide-out navigation
- Accordion-style collapsible menu sections
- Touch-friendly interface

### Layout Architecture
Clean separation of concerns:
- **MainLayout** - Handles theme, title bar, scrolling
- **Pages** - Pure content without layout concerns
- **Components** - Reusable UI elements

### Modern Hamburger Animation
Custom animated icon that transforms:
- Three bars → X on open
- Smooth rotation and fade transitions
- Middle bar scales from left to create asymmetric modern look

## ⚙️ Configuration

### Theme System
The app includes a comprehensive theme system with:
- **Light Mode** - Clean, bright interface
- **Dark Mode** - Easy on the eyes
- **System Mode** - Auto-detects OS preference and updates live

Toggle theme via:
- Title bar theme button (Sun/Moon icon)
- View menu → Theme submenu
- Mobile hamburger menu → View → Theme

### Window Configuration
Edit `src-tauri/tauri.conf.json` to customize:
- App name and version
- Window size and decorations
- File system permissions
- Bundle settings
- Icon and metadata

### Tailwind Configuration
Modify `tailwind.config.js` for:
- Custom color schemes
- Design tokens
- Dark mode variants
- Component styling

## 🎨 UI Components

### Custom Components
- **TitleBar** - Custom window controls with draggable area
  - Minimize, Maximize/Restore, Close buttons
  - Integrated theme toggle with Sun/Moon icons
  - Responsive hamburger menu (mobile)
  - Desktop menubar (File, Edit, View, Help)
  - About and Keyboard Shortcuts dialogs

### Shadcn UI Components (52+)
Comprehensive showcase of production-ready components:

**Form & Input**
- Button (6 variants, 4 sizes)
- Input, Textarea, Checkbox, Switch
- Radio Group, Select, Input OTP
- Form (with React Hook Form + Zod validation)
- Field (modern pattern with Controller)
- Input Group (with addons)

**Navigation**
- Menubar, Navigation Menu
- Breadcrumb, Tabs, Pagination
- Command (⌘K style palette)

**Feedback**
- Alert, Alert Dialog, Dialog
- Toast/Sonner, Progress, Spinner
- Skeleton, Badge

**Layout**
- Card, Separator, Scroll Area
- Resizable Panels, Aspect Ratio
- Sheet (slide-over panels)

**Overlay**
- Dropdown Menu, Context Menu
- Popover, Hover Card, Tooltip
- Drawer (bottom sheet)

**Data Display**
- Table, Avatar, Calendar
- Carousel, Accordion, Collapsible
- Toggle, Toggle Group

**And More**
- Each component includes working examples
- Full TypeScript support
- Accessible by default (Radix UI primitives)

## 🛠️ Development Tips

### Adding New Pages
1. Create component in `src/pages/YourPage.tsx`
2. Import in `App.tsx` or use routing
3. Layout is automatically applied via `MainLayout`

### Adding UI Components
```bash
# Add shadcn components as needed
npx shadcn-ui@latest add [component-name]
```

### Customizing Theme
- Edit `src/components/theme-provider.tsx` for theme logic
- Modify CSS variables in `src/styles.css`
- Update Tailwind config for design tokens

## 📱 Responsive Breakpoints

```css
/* Mobile-first approach */
< 768px   → Mobile (hamburger menu)
≥ 768px   → Desktop (menubar)
```

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Improve documentation

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Credits

- Built with [Tauri](https://tauri.app/), [React](https://react.dev/), and [Vite](https://vitejs.dev/)
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- Original template inspiration from [Aero25x](https://github.com/Aero25x/tauri-shadcn-vite-template)

## 🌟 Show Your Support

If you find this starter kit helpful, please consider giving it a ⭐ on GitHub!

---

**Built with ❤️ by the Project Wind Team**
