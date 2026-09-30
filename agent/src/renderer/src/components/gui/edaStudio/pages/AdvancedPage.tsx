/**
 * AdvancedPage —— 第 5 个 tab,提供 "伪 IDE" 文件树 + tab + 编辑器布局。
 *
 * 把 gui/ 下那 6 个组件(`EDASidebar` / `EDATabsBar` / `FileEditor` 及
 * `editors/`、`parsers/`)接进真实数据流:
 *   - workspace:复用 store 里已有的 workspace,跟其他 tab 同源
 *   - listFiles:trpc 递归列目录
 *   - readFile / writeFile:FileEditor 内部 + 这里显式 invalidate
 *
 * 状态归属:
 *   - openFiles / activeId / drafts 都是组件局部 state,刷新即丢
 *   - 关闭 tab 时同步清掉 React Query 的 readFile 缓存,免得切走再切回来拿到旧内容
 *   - 写盘成功后 setDrafts 里把对应 entry 删掉 → dirty marker 自动消失
 */

import { useCallback, useMemo, useState } from 'react';

import { trpc } from '../../../../lib/trpc';
import { useStudioStore } from '../../../../state/eda-studio-store';
import { EDASidebar } from '../../EDASidebar';
import { EDATabsBar } from '../../EDATabsBar';
import { FileEditor, useInvalidateReadFile } from '../../FileEditor';
import type { OpenFile, TreeNode } from '../../types';

function newId(path: string): string {
  return path;
}

export function AdvancedPage(): React.JSX.Element {
  const workspace = useStudioStore((s) => s.workspace);
  const setWorkspace = useStudioStore((s) => s.setWorkspace);

  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Map<string, string>>(() => new Map());

  // workspace 没设好之前不查 tree,免得发请求到空 path 上炸掉后端校验。
  const listQuery = trpc.eda.listFiles.useQuery(
    { path: workspace ?? '' },
    { enabled: Boolean(workspace) },
  );
  const writeMutation = trpc.eda.writeFile.useMutation();
  const pickMutation = trpc.eda.pickWorkspace.useMutation();
  const invalidateReadFile = useInvalidateReadFile();

  const dirtyPaths = useMemo(() => new Set(drafts.keys()), [drafts]);
  const activeFile = useMemo(
    () => openFiles.find((f) => f.id === activeId) ?? null,
    [openFiles, activeId],
  );
  const canSave = activeFile !== null && drafts.has(activeFile.id) && !writeMutation.isPending;

  const openFile = useCallback((node: TreeNode) => {
    const id = newId(node.path);
    setOpenFiles((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      const kind = node.kind;
      if (!kind) return prev; // 没有 kind 说明不是 EDA 关心的扩展名,忽略
      const file: OpenFile = {
        id,
        name: node.name,
        path: node.path,
        kind,
      };
      return [...prev, file];
    });
    setActiveId(id);
  }, []);

  const closeFile = useCallback(
    (id: string) => {
      setOpenFiles((prev) => {
        const remaining = prev.filter((f) => f.id !== id);
        if (activeId === id) {
          setActiveId(remaining[remaining.length - 1]?.id ?? null);
        }
        return remaining;
      });
      setDrafts((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      invalidateReadFile(id);
    },
    [activeId, invalidateReadFile],
  );

  const onChange = useCallback(
    (content: string) => {
      if (!activeId) return;
      setDrafts((prev) => {
        const next = new Map(prev);
        next.set(activeId, content);
        return next;
      });
    },
    [activeId],
  );

  const onSave = useCallback((): void => {
    if (!activeFile) return;
    const draft = drafts.get(activeFile.id);
    if (draft === undefined) return;
    const path = activeFile.path;
    writeMutation.mutate(
      { path, content: draft },
      {
        onSuccess: () => {
          setDrafts((prev) => {
            if (!prev.has(path)) return prev;
            const next = new Map(prev);
            next.delete(path);
            return next;
          });
          // 写盘后让 readFile 缓存重读,FileEditor 下次渲染会拿到新 content
          invalidateReadFile(path);
        },
      },
    );
  }, [activeFile, drafts, invalidateReadFile, writeMutation]);

  const onPickWorkspace = useCallback(async () => {
    const path = await pickMutation.mutateAsync();
    if (path) setWorkspace(path);
  }, [pickMutation, setWorkspace]);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <EDASidebar
        tree={listQuery.data ?? []}
        workspace={workspace}
        isLoading={listQuery.isLoading}
        error={listQuery.error?.message ?? null}
        onOpenFile={openFile}
        onPickWorkspace={onPickWorkspace}
        onClearWorkspace={() => setWorkspace(null)}
        onSave={onSave}
        canSave={canSave}
        isSaving={writeMutation.isPending}
        activeFileId={activeId}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <EDATabsBar
          files={openFiles}
          activeId={activeId ?? ''}
          dirtyPaths={dirtyPaths}
          onSelect={setActiveId}
          onClose={closeFile}
        />
        <div className="min-h-0 flex-1">
          {activeFile ? (
            <FileEditor
              file={activeFile}
              draft={drafts.get(activeFile.id)}
              onChange={onChange}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-fg-tertiary text-sm">
              Open a .toml / .canvas / .vcd / .csv file from the Explorer to start editing.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
