/**
 * EDATabsBar —— 顶部打开的文件 tab。
 */

import { Plus, X, FileText } from 'lucide-react';

import type { FileKind as _FileKind, OpenFile } from './types';

function FileKindIcon({ kind: _kind }: { kind: _FileKind }): React.JSX.Element {
  // 后续如果给每种文件加专属图标,在这里 case 分发。
  return <FileText className="size-[12px] text-fg-tertiary" />;
}

interface Props {
  files: OpenFile[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
}

export function EDATabsBar({ files, activeId, onSelect, onClose }: Props): React.JSX.Element {
  return (
    <div className="flex h-9 flex-shrink-0 items-center overflow-x-auto border-border-default border-b bg-surface">
      {files.map((f) => {
        const isActive = f.id === activeId;
        return (
          <div
            key={f.id}
            role="tab"
            tabIndex={0}
            onClick={() => onSelect(f.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(f.id);
              }
            }}
            className={[
              'group flex h-full cursor-pointer items-center gap-2 border-border-default border-r px-3 text-xs',
              isActive
                ? 'bg-canvas text-fg-primary'
                : 'text-fg-tertiary hover:bg-surface-strong',
            ].join(' ')}
            style={{
              borderTop: isActive ? '2px solid hsl(var(--accent))' : '2px solid transparent',
            }}
          >
            <FileKindIcon kind={f.kind} />
            <span className="whitespace-nowrap">{f.name}</span>
            {f.dirty && <span className="size-1.5 rounded-full bg-accent" />}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose(f.id);
              }}
              aria-label={`Close ${f.name}`}
              className="ml-1 rounded p-0.5 opacity-0 hover:bg-surface-strong group-hover:opacity-100"
            >
              <X className="size-[10px]" />
            </button>
          </div>
        );
      })}
      <button
        type="button"
        aria-label="New tab"
        className="ml-1 flex h-7 w-7 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
      >
        <Plus className="size-[12px]" />
      </button>
    </div>
  );
}
