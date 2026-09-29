/**
 * EDAPage —— EDA 工作台,bb-agent `/eda` 路由的页面组件。
 *
 * 布局(沿用 de/ 三段式 + VS Code 文件 tab):
 *
 * ┌─────────────────────────────────────────────────────────┐
 * │              TopBar (back / title / lang)               │
 * ├── Sidebar ── Tabs ── Editor ─── RightPanel ─── 折叠 ──┤
 * │  (220px)    (32px) (flex)    (300px)        (20px)   │
 * └─────────────────────────────────────────────────────────┘
 *
 * 数据全部走 trpc:
 *   - eda.pickWorkspace        弹原生 folder picker
 *   - eda.listFiles({ path })   扫工作区文件
 *   - eda.readFile({ path })    读单个文件(FileEditor 内部用)
 *
 * 样式 token 全部来自 design system,不写自定义 CSS 颜色。
 */

import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Cpu, PanelLeft, Settings, Globe2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { EDASidebar } from './EDASidebar';
import { EDATabsBar } from './EDATabsBar';
import { EDARightPanel } from './EDARightPanel';
import { FileEditor, useInvalidateReadFile } from './FileEditor';
import { trpc } from '../../lib/trpc';
import type { OpenFile, TreeNode } from './types';

export function EDAPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const invalidateRead = useInvalidateReadFile();

  const [workspace, setWorkspace] = useState<string | null>(null);
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // tree 通过 trpc 拿,enabled 等 workspace 选好后再启动。
  const treeQuery = trpc.eda.listFiles.useQuery(
    { path: workspace ?? '' },
    { enabled: Boolean(workspace) },
  );

  const pickWorkspace = trpc.eda.pickWorkspace.useMutation({
    onSuccess: (path) => {
      if (path) {
        // 切换工作区时清掉旧 tab 和缓存,避免旧路径的内容闪一下。
        setFiles([]);
        setActiveId(null);
        setWorkspace(path);
      }
    },
  });

  const openFile = useCallback((node: TreeNode) => {
    if (node.type !== 'file' || !node.kind) return;
    // 用绝对路径作为 tab id,避免不同目录下同名文件(id 冲突)互相覆盖。
    const kind: OpenFile['kind'] = node.kind;
    setFiles((prev) => {
      if (prev.find((f) => f.id === node.path)) return prev;
      const file: OpenFile = {
        id: node.path,
        name: node.name,
        path: node.path,
        kind,
      };
      return [...prev, file];
    });
    setActiveId(node.path);
  }, []);

  const closeFile = useCallback(
    (id: string) => {
      setFiles((prev) => {
        const target = prev.find((f) => f.id === id);
        if (target) invalidateRead(target.path);
        const next = prev.filter((f) => f.id !== id);
        if (id === activeId) {
          setActiveId(next.length > 0 ? next[next.length - 1].id ?? null : null);
        }
        return next;
      });
    },
    [activeId, invalidateRead],
  );

  // Ctrl/Cmd+W 关掉当前 tab。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (activeId) closeFile(activeId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, closeFile]);

  const toggleLang = (): void => {
    void i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh');
  };
  const isZh = i18n.language.startsWith('zh');

  const active = files.find((f) => f.id === activeId) ?? null;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-fg-primary">
      {/* ---- TopBar ---- */}
      <header className="z-50 flex h-12 flex-shrink-0 items-center justify-between border-border-default border-b bg-surface px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-fg-secondary text-xs hover:bg-surface-strong hover:text-fg-primary"
          >
            <span>‹</span>
            <span>Home</span>
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-bold text-fg-on-accent text-xs">
            <Cpu className="size-[14px]" />
          </div>
          <span className="font-semibold text-sm">EDA Workbench</span>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-fg-tertiary text-[10px]">
            v0.2
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-md border border-border-default bg-canvas px-3 py-1.5 font-medium text-fg-primary text-xs hover:bg-surface-strong"
          >
            <Globe2 className="size-[13px]" />
            {isZh ? '简体中文' : 'English'}
          </button>
          <button
            type="button"
            aria-label="Settings"
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Settings className="size-[13px]" />
          </button>
        </div>
      </header>

      {/* ---- Body ---- */}
      <div className="flex flex-1 overflow-hidden">
        <EDASidebar
          tree={treeQuery.data ?? []}
          workspace={workspace}
          isLoading={treeQuery.isLoading}
          error={treeQuery.error ? treeQuery.error.message : null}
          onOpenFile={openFile}
          onPickWorkspace={() => pickWorkspace.mutate()}
          onClearWorkspace={() => {
            setFiles([]);
            setActiveId(null);
            setWorkspace(null);
          }}
          activeFileId={activeId}
        />

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {files.length === 0 ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center text-fg-tertiary text-sm">
              {workspace
                ? 'Select a file from the explorer to start editing.'
                : 'Open a workspace from the explorer to get started.'}
            </div>
          ) : (
            <>
              <EDATabsBar
                files={files}
                activeId={activeId ?? ''}
                onSelect={setActiveId}
                onClose={closeFile}
              />
              <div className="flex-1 overflow-hidden bg-canvas">
                {active && <FileEditor file={active} />}
              </div>
              <div className="flex h-6 flex-shrink-0 items-center justify-between border-border-default border-t bg-surface px-3 text-[11px] text-fg-tertiary">
                <div className="flex items-center gap-3 truncate">
                  <span className="truncate">{active?.path}</span>
                  <span className="text-fg-disabled">|</span>
                  <span>UTF-8</span>
                  <span className="text-fg-disabled">|</span>
                  <span className="uppercase">{active?.kind}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span>Ln 1, Col 1</span>
                  <span className="text-fg-disabled">|</span>
                  <span>Spaces: 2</span>
                </div>
              </div>
            </>
          )}
        </main>

        <EDARightPanel
          collapsed={rightCollapsed}
          onCollapse={() => setRightCollapsed(true)}
        />
        <button
          type="button"
          onClick={() => setRightCollapsed((c) => !c)}
          aria-label={rightCollapsed ? 'Expand panel' : 'Collapse panel'}
          className="flex w-5 flex-shrink-0 items-center justify-center border-border-default border-l bg-surface text-fg-tertiary hover:bg-surface-strong"
          style={{ borderLeftWidth: rightCollapsed ? 0 : 1 }}
        >
          <span
            className="transition-transform duration-200"
            style={{ transform: rightCollapsed ? 'rotate(180deg)' : 'none' }}
          >
            <PanelLeft className="size-[14px]" />
          </span>
        </button>
      </div>
    </div>
  );
}