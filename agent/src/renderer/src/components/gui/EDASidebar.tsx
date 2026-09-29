/**
 * EDASidebar —— Explorer / 文件树。
 *
 * 渲染 FILE_TREE,可展开/折叠目录,点击文件触发 onOpen。
 * 样式只使用 agent 的 design tokens。
 */

import {
  ChevronRight,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  Plus,
  Save,
  Search,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import type { FileKind, TreeNode } from './types';

interface Props {
  tree: TreeNode[];
  workspace: string | null;
  isLoading: boolean;
  error: string | null;
  onOpenFile: (node: TreeNode) => void;
  onPickWorkspace: () => void;
  onClearWorkspace: () => void;
  onSave: () => void;
  canSave: boolean;
  isSaving: boolean;
  activeFileId: string | null;
}

function FileKindIcon({ kind }: { kind: FileKind | undefined }): React.JSX.Element {
  if (!kind) return <FileText className="size-[12px] text-fg-tertiary" />;
  // 暂时所有文件都画同一个文档图标——按 kind 区分的话后期再补图标包。
  return <FileText className="size-[12px] text-fg-tertiary" />;
}

function TreeRow({
  node,
  depth,
  openSet,
  toggleDir,
  onOpenFile,
  activeFileId,
}: {
  node: TreeNode;
  depth: number;
  openSet: Set<string>;
  toggleDir: (k: string) => void;
  onOpenFile: (n: TreeNode) => void;
  activeFileId: string | null;
}): React.JSX.Element {
  const isDir = node.type === 'dir';
  const isOpen = openSet.has(node.path);
  const isActive = !isDir && activeFileId === node.path;

  const className = [
    'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-xs',
    isActive
      ? 'bg-elevated text-fg-primary'
      : 'text-fg-secondary hover:bg-surface-strong hover:text-fg-primary',
  ].join(' ');

  if (isDir) {
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleDir(node.path)}
          className={className}
          style={{ paddingLeft: depth * 10 + 4 }}
        >
          {isOpen ? (
            <ChevronRight className="size-[10px] rotate-90 text-fg-tertiary" />
          ) : (
            <ChevronRight className="size-[10px] text-fg-tertiary" />
          )}
          {isOpen ? (
            <FolderOpen className="size-[12px] text-fg-tertiary" />
          ) : (
            <Folder className="size-[12px] text-fg-tertiary" />
          )}
          <span>{node.name}</span>
        </button>
        {isOpen &&
          node.children?.map((c) => (
            <TreeRow
              key={c.path}
              node={c}
              depth={depth + 1}
              openSet={openSet}
              toggleDir={toggleDir}
              onOpenFile={onOpenFile}
              activeFileId={activeFileId}
            />
          ))}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenFile(node)}
      className={className}
      style={{ paddingLeft: depth * 10 + 20 }}
    >
      <FileKindIcon kind={node.kind} />
      <span>{node.name}</span>
    </button>
  );
}

export function EDASidebar({
  tree,
  workspace,
  isLoading,
  error,
  onOpenFile,
  onPickWorkspace,
  onClearWorkspace,
  onSave,
  canSave,
  isSaving,
  activeFileId,
}: Props): React.JSX.Element {
  const initialOpen = useMemo(() => new Set<string>(), []);
  const [openSet, setOpenSet] = useState<Set<string>>(initialOpen);

  const toggleDir = useCallback((key: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return (
    <aside className="flex w-[220px] flex-shrink-0 flex-col border-border-default border-r bg-surface">
      <div className="flex h-9 items-center justify-between border-border-default border-b px-3 text-[11px] font-semibold uppercase tracking-wide text-fg-tertiary">
        <span>Explorer</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="New file"
            className="flex h-5 w-5 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Plus className="size-[11px]" />
          </button>
          <button
            type="button"
            aria-label="Save"
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="flex h-5 w-5 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="size-[11px]" />
          </button>
        </div>
      </div>
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute top-1/2 left-2 size-[12px] -translate-y-1/2 text-fg-tertiary" />
          <input
            type="text"
            placeholder="Search files…"
            className="h-7 w-full rounded-md border border-border-default bg-canvas pr-2 pl-7 text-fg-primary text-xs placeholder:text-fg-tertiary focus:border-border-focus focus:outline-none"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {workspace === null ? (
          <div className="flex flex-col items-center justify-center gap-3 px-4 py-10 text-fg-tertiary">
            <FolderInput className="size-[24px] text-fg-disabled" />
            <p className="text-center text-xs">No workspace opened yet.</p>
            <button
              type="button"
              onClick={onPickWorkspace}
              className="rounded-md bg-accent px-3 py-1.5 font-medium text-fg-on-accent text-xs hover:bg-accent-hover"
            >
              Open Workspace…
            </button>
          </div>
        ) : isLoading ? (
          <div className="px-3 py-2 text-fg-tertiary text-xs">Loading…</div>
        ) : error ? (
          <div className="px-3 py-2 text-fg-tertiary text-xs">{error}</div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-2 text-fg-tertiary text-xs">
            No .toml / .canvas / .vcd / .csv files found.
          </div>
        ) : (
          <div className="space-y-0.5">
            {tree.map((n) => (
              <TreeRow
                key={n.path}
                node={n}
                depth={0}
                openSet={openSet}
                toggleDir={toggleDir}
                onOpenFile={onOpenFile}
                activeFileId={activeFileId}
              />
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-border-default border-t px-3 py-2 text-[11px] text-fg-tertiary">
        <span className="truncate" title={workspace ?? ''}>
          {workspace ? workspace.split(/[\\/]/).pop() : 'no workspace'}
        </span>
        {workspace && (
          <button
            type="button"
            onClick={onClearWorkspace}
            className="rounded px-1.5 py-0.5 text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            Close
          </button>
        )}
      </div>
    </aside>
  );
}
