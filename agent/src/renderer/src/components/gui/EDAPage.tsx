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
 *   - eda.writeFile             写回磁盘(草稿保存)
 *
 * 草稿(draft)管理:
 *   - 用户在编辑器里改 → onContentChange(path, content)
 *   - drafts[path] = content;dirty = draft !== cache.content
 *   - 保存成功 → setQueryData 同步缓存 + 清掉 draft
 *
 * 样式 token 全部来自 design system,不写自定义 CSS 颜色。
 */

import { useNavigate } from '@tanstack/react-router';
import { Cpu, Globe2, PanelLeft, Save, Settings } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { trpc } from '../../lib/trpc';
import { EDARightPanel } from './EDARightPanel';
import { EDASidebar } from './EDASidebar';
import { EDATabsBar } from './EDATabsBar';
import { FileEditor, useInvalidateReadFile } from './FileEditor';
import type { OpenFile, TreeNode } from './types';

export function EDAPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const invalidateRead = useInvalidateReadFile();
  const utils = trpc.useUtils();

  const [workspace, setWorkspace] = useState<string | null>(null);
  const [files, setFiles] = useState<OpenFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  // 草稿:path → 用户当前编辑的内容。undefined 表示没编辑过(用磁盘内容)。
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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
        setDrafts({});
        setWorkspace(path);
        // 启动文件监听
        startWatching.mutate({ path });
      }
    },
  });

  const startWatching = trpc.eda.startWatching.useMutation();
  const stopWatching = trpc.eda.stopWatching.useMutation();

  const writeFile = trpc.eda.writeFile.useMutation({
    onSuccess: (_data, vars) => {
      // 同步缓存:让 editor 立刻显示新内容(无需 refetch 等待)
      utils.eda.readFile.setData({ path: vars.path }, (prev) =>
        prev ? { ...prev, content: vars.content } : prev,
      );
      // 清掉这条 path 的 draft
      setDrafts((prev) => {
        if (!(vars.path in prev)) return prev;
        const next = { ...prev };
        delete next[vars.path];
        return next;
      });
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
          setActiveId(next.length > 0 ? (next[next.length - 1].id ?? null) : null);
        }
        return next;
      });
      // 关 tab 时顺手把它的 draft 也清掉
      setDrafts((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    },
    [activeId, invalidateRead],
  );

  // 编辑器内容变化 → 写 drafts
  const handleContentChange = useCallback((path: string, content: string) => {
    setDrafts((prev) => ({ ...prev, [path]: content }));
  }, []);

  // 保存当前 active tab 的草稿
  const saveActive = useCallback(() => {
    if (!activeId) return;
    const draft = drafts[activeId];
    if (draft === undefined) return; // not dirty
    writeFile.mutate({ path: activeId, content: draft });
  }, [activeId, drafts, writeFile]);

  // Ctrl/Cmd+W 关 tab,Ctrl/Cmd+S 保存当前 tab。
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === 'w') {
        e.preventDefault();
        if (activeId) closeFile(activeId);
      } else if (k === 's') {
        e.preventDefault();
        saveActive();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, closeFile, saveActive]);

  // 订阅工作区文件变化。事件 → invalidate 对应缓存。
  // listFiles 整个树重扫;readFile 只 invalidate 变化的路径。
  // 用户的 draft 不会被清掉(由用户决定是否保留),缓存重新拉后会再次
  // 成为"原稿",draft 仍然会盖在 editor 上显示。
  useEffect(() => {
    const unsubscribe = window.bb.onEdaFsEvent((ev) => {
      // 任何文件变动都让 listFiles 重扫一次 → sidebar 立刻跟上
      utils.eda.listFiles.invalidate();
      // 影响的 readFile 缓存也清掉,正在打开的 tab 重新读
      utils.eda.readFile.invalidate({ path: ev.path });
    });
    return () => {
      unsubscribe();
    };
  }, [utils]);

  // 卸载 / 切走时停 watcher,免得占用 fd。
  // 注意:stopWatching 本身每 render 都是新对象,如果放进 deps 就会让 cleanup
  // 每 render 都跑一次,触发 setState → 死循环 "Maximum update depth exceeded"。
  // 这里只在真正 unmount 时停一次。
  useEffect(() => {
    return () => {
      stopWatching.mutate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleLang = (): void => {
    void i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh');
  };
  const isZh = i18n.language.startsWith('zh');

  const active = files.find((f) => f.id === activeId) ?? null;

  // 给每个 open file 计算 dirty 状态。
  // dirty 的定义:drafts[path] 存在 && draft !== 缓存里的内容。
  // 缓存来自 React Query(可能尚未就绪);用 utils.getData 同步取。
  const dirtySet = useMemo(() => {
    const out = new Set<string>();
    for (const path of Object.keys(drafts)) {
      const cached = utils.eda.readFile.getData({ path });
      if (!cached) continue;
      if (cached.content !== drafts[path]) out.add(path);
    }
    return out;
  }, [drafts, utils]);

  const activeDraft = active ? drafts[active.path] : undefined;
  const activeDirty = active ? dirtySet.has(active.path) : false;
  const anyDirty = dirtySet.size > 0;

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
            onClick={saveActive}
            disabled={!activeDirty || writeFile.isPending}
            aria-label="Save active file"
            className="flex h-7 items-center gap-1.5 rounded-md border border-border-default bg-canvas px-3 font-medium text-fg-primary text-xs hover:bg-surface-strong disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="size-[13px]" />
            {writeFile.isPending ? 'Saving…' : 'Save'}
          </button>
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
            setDrafts({});
          }}
          onSave={saveActive}
          canSave={anyDirty}
          isSaving={writeFile.isPending}
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
                dirtyPaths={dirtySet}
                onSelect={setActiveId}
                onClose={closeFile}
              />
              <div className="flex-1 overflow-hidden bg-canvas">
                {active && (
                  <FileEditor
                    file={active}
                    draft={activeDraft}
                    onChange={(content) => handleContentChange(active.path, content)}
                  />
                )}
              </div>
              <div className="flex h-6 flex-shrink-0 items-center justify-between border-border-default border-t bg-surface px-3 text-[11px] text-fg-tertiary">
                <div className="flex items-center gap-3 truncate">
                  <span className="truncate">{active?.path}</span>
                  <span className="text-fg-disabled">|</span>
                  <span>UTF-8</span>
                  <span className="text-fg-disabled">|</span>
                  <span className="uppercase">{active?.kind}</span>
                  {activeDirty && (
                    <>
                      <span className="text-fg-disabled">|</span>
                      <span className="text-accent">● modified</span>
                    </>
                  )}
                  {writeFile.error && (
                    <>
                      <span className="text-fg-disabled">|</span>
                      <span className="text-status-danger">
                        save error: {writeFile.error.message}
                      </span>
                    </>
                  )}
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

        <EDARightPanel collapsed={rightCollapsed} onCollapse={() => setRightCollapsed(true)} />
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
