/**
 * FileEditor —— 按 file.kind 选编辑器。
 *
 * 编辑器只关心"当前文件 + 它的内容";由父组件 EDAPage
 * 通过 trpc 拉好 content,再传给这里。
 *
 * 草稿(draft)由 EDAPage 统一管:用户输入只更新父组件的 drafts map,
 * 编辑器只是把 draft 渲染出来;父组件负责在保存成功后清掉 draft、
 * 用 setQueryData 同步缓存内容,这样 draft 永远是"待保存的差异"。
 */

import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback } from 'react';

import { trpc } from '../../lib/trpc';
import { BallIsaTable } from './editors/BallIsaTable';
import { SchematicEditor } from './editors/SchematicEditor';
import { TomlEditor } from './editors/TomlEditor';
import { WaveformViewer } from './editors/WaveformViewer';
import type { FileKind, OpenFile } from './types';

interface Props {
  file: OpenFile;
  /** 父组件持有的"未保存内容",undefined 表示还没编辑过。 */
  draft?: string;
  /** 用户在编辑器里改了内容,父组件会更新 draft 状态。 */
  onChange?: (content: string) => void;
}

function ContentFor({
  kind,
  content,
  file,
  onChange,
}: {
  kind: FileKind;
  content: string;
  file: OpenFile;
  onChange?: (content: string) => void;
}): React.JSX.Element {
  switch (kind) {
    case 'toml':
      return <TomlEditor value={content} onChange={onChange} />;
    case 'canvas':
      return <SchematicEditor />;
    case 'vcd':
      return <WaveformViewer filename={file.name} content={content} />;
    case 'csv':
      return <BallIsaTable content={content} />;
  }
}

export function FileEditor({ file, draft, onChange }: Props): React.JSX.Element {
  // readFile 是 query,React Query 会按 path 缓存。tab 关掉后用
  // utils.eda.readFile.removeQueries 清理(由父组件负责)。
  const query = trpc.eda.readFile.useQuery({ path: file.path }, { enabled: Boolean(file.path) });

  // 切走类型不一致时不要把旧缓存闪一下:kind 变了就当作 pending。
  if (query.data && query.data.kind !== file.kind) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-fg-tertiary text-sm">
        <Loader2 className="size-[14px] animate-spin" />
        Loading…
      </div>
    );
  }

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-fg-tertiary text-sm">
        <Loader2 className="size-[14px] animate-spin" />
        Reading {file.name}…
      </div>
    );
  }

  if (query.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-fg-tertiary text-sm">
        <AlertCircle className="size-[18px] text-status-danger" />
        <div>Failed to read {file.path}</div>
        <div className="text-fg-disabled text-xs">{query.error.message}</div>
      </div>
    );
  }

  const data = query.data;
  if (!data) return <div className="h-full" />;
  // 优先用 draft,没有就拿磁盘上的原文。
  const content = draft ?? data.content;
  return <ContentFor kind={data.kind} content={content} file={file} onChange={onChange} />;
}

/**
 * 工具:父组件关闭一个 tab 时把它的 readFile 缓存也清掉,免得 React Query
 * 一直缓存过期文件路径对应的内容。
 *
 * 注意:必须返回稳定引用(useCallback + 稳定 deps),否则下游 useCallback
 * 依赖它的组件每次 render 都会重建,会带动相关 useEffect 重复跑 cleanup。
 */
export function useInvalidateReadFile(): (path: string) => void {
  const utils = trpc.useUtils();
  return useCallback(
    (path: string) => {
      utils.eda.readFile.invalidate({ path });
    },
    [utils],
  );
}
