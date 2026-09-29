/**
 * FileEditor —— 按 file.kind 选编辑器。
 *
 * 编辑器只关心"当前文件 + 它的内容";由父组件 EDAPage
 * 通过 trpc 拉好 content,再传给这里。
 */

import { AlertCircle, Loader2 } from 'lucide-react';

import { TomlEditor } from './editors/TomlEditor';
import { SchematicEditor } from './editors/SchematicEditor';
import { WaveformViewer } from './editors/WaveformViewer';
import { BallIsaTable } from './editors/BallIsaTable';
import { trpc } from '../../lib/trpc';
import type { FileKind, OpenFile } from './types';

interface Props {
  file: OpenFile;
}

function ContentFor({ kind, content, file }: { kind: FileKind; content: string; file: OpenFile }): React.JSX.Element {
  switch (kind) {
    case 'toml':
      return <TomlEditor value={content} />;
    case 'canvas':
      return <SchematicEditor />;
    case 'vcd':
      return <WaveformViewer filename={file.name} content={content} />;
    case 'csv':
      return <BallIsaTable content={content} />;
  }
}

export function FileEditor({ file }: Props): React.JSX.Element {
  // readFile 是 query,React Query 会按 path 缓存。tab 关掉后用
  // utils.edareadFile.removeQueries 清理(由父组件负责)。
  const query = trpc.eda.readFile.useQuery(
    { path: file.path },
    { enabled: Boolean(file.path) },
  );

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
  return <ContentFor kind={data.kind} content={data.content} file={file} />;
}

/**
 * 工具:父组件关闭一个 tab 时把它的 readFile 缓存也清掉,免得 React Query
 * 一直缓存过期文件路径对应的内容。
 */
export function useInvalidateReadFile(): (path: string) => void {
  const utils = trpc.useUtils();
  return (path) => {
    utils.eda.readFile.invalidate({ path });
  };
}