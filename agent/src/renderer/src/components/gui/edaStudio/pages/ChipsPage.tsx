/**
 * ChipsPage —— chip 列表 + 选中 chip 的 config 视图。
 *
 * 布局(左固定 240 + 右 scroll):
 *   ┌────────────┬───────────────────────────────┐
 *   │ chip 列表  │ chip header                   │
 *   │ - toy      │ ───                           │
 *   │ - pebble   │ chip.toml  (raw,monospace)   │
 *   │ - goban    │ ───                           │
 *   │ - ...      │ designs/*.toml (files list)  │
 *   │            │ ───                           │
 *   │            │ tiles/*.toml  (files list)   │
 *   │            │ ───                           │
 *   │            │ scala targets                 │
 *   │            │ (CustomConfigs + verilator + │
 *   │            │  p2e 链接到 git)             │
 *   └────────────┴───────────────────────────────┘
 *
 * 设计原则(来自 chip-designer skill):
 *   - chip.toml 是入口,声明用了哪些 designs + sims
 *   - designs/*.toml 声明 tiles
 *   - tiles/*.toml 声明 sharedMem + cores
 *   - 三个 Scala target 是不可绕过的:CustomConfigs.scala / verilator / p2e
 *
 * v0.4:configs 内容用 placeholder,标 TODO —— 真读 toml 等 bb-server + toml parser。
 */

import { ChevronRight, Cpu, FileCode2, Folder, Layers } from 'lucide-react';
import { useEffect } from 'react';

import { MOCK_CHIPS, MOCK_WORKSPACES, type WorkspaceInfo } from '../bb-mock';
import { useStudioStore } from '../../../../state/eda-studio-store';

export function ChipsPage(): React.JSX.Element {
  const currentChip = useStudioStore((s) => s.currentChip);
  const setCurrentChip = useStudioStore((s) => s.setCurrentChip);

  // 第一次进 ChipsPage,默认选 toy
  useEffect(() => {
    if (!currentChip) setCurrentChip('toy');
  }, [currentChip, setCurrentChip]);

  const ws = MOCK_WORKSPACES.find((w) => w.chip === currentChip);

  return (
    <div className="flex h-full min-h-0">
      {/* 左侧 chip 列表 */}
      <aside className="flex w-60 flex-shrink-0 flex-col overflow-y-auto border-border-default border-r bg-surface">
        <div className="border-border-default border-b px-4 py-3">
          <h2 className="font-medium text-fg-primary text-sm">Chips</h2>
          <p className="mt-0.5 text-fg-tertiary text-[11px]">
            {MOCK_CHIPS.length} 个 · bb-server mock
          </p>
        </div>
        <ul className="flex flex-col">
          {MOCK_CHIPS.map((chip) => {
            const active = chip === currentChip;
            const ws = MOCK_WORKSPACES.find((w) => w.chip === chip);
            return (
              <li key={chip}>
                <button
                  type="button"
                  onClick={() => setCurrentChip(chip)}
                  className={
                    active
                      ? 'flex w-full items-center gap-2 border-l-2 border-accent bg-accent/10 px-4 py-2 text-left'
                      : 'flex w-full items-center gap-2 border-l-2 border-transparent px-4 py-2 text-left hover:bg-surface-strong'
                  }
                >
                  <Cpu className="size-[13px] text-fg-tertiary" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-mono font-medium text-fg-primary text-xs">{chip}</span>
                    {ws && (
                      <span className="truncate text-fg-tertiary text-[10px]">
                        {ws.designs.length} designs · {ws.cores.length} cores
                      </span>
                    )}
                  </div>
                  {active && <ChevronRight className="size-[12px] text-accent" />}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 右侧 chip detail */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {!ws ? (
          <div className="flex flex-1 items-center justify-center text-fg-tertiary text-sm">
            选一个 chip 看 config。
          </div>
        ) : (
          <ChipDetail ws={ws} />
        )}
      </main>
    </div>
  );
}

function ChipDetail({ ws }: { ws: WorkspaceInfo }): React.JSX.Element {
  const tileFiles = ws.designs.flatMap((d) => [
    `${ws.root}/configs/${d.replace(/^designs\//, 'designs/')}`,
    // mock tiles:每个 design 假设有 1-2 个 tile
    ...(d.endsWith('baremetal.toml')
      ? []
      : [`${ws.root}/configs/designs/tiles/${ws.chip}_core.toml`]),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Cpu className="size-[18px] text-accent" />
          <h1 className="font-mono font-semibold text-fg-primary text-xl">{ws.chip}</h1>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-fg-tertiary text-[10px] uppercase">
            production
          </span>
        </div>
        <p className="font-mono text-fg-tertiary text-xs">{ws.root}</p>
      </header>

      {/* chip.toml —— 入口,选 designs + sims */}
      <ConfigBlock
        icon={<FileCode2 className="size-[14px]" />}
        title="chip.toml"
        subtitle="Entry · selects designs + simulation configs"
        path={`${ws.root}/configs/chip.toml`}
        content={renderChipToml(ws)}
      />

      {/* designs/*.toml */}
      <ConfigBlock
        icon={<Layers className="size-[14px]" />}
        title="designs/*.toml"
        subtitle="Each declares a tile set"
        path={`${ws.root}/configs/designs/`}
        files={ws.designs.map((d) => `${ws.root}/configs/${d}`)}
      />

      {/* tiles/*.toml */}
      <ConfigBlock
        icon={<Layers className="size-[14px]" />}
        title="designs/tiles/*.toml"
        subtitle="Each declares sharedMem + cores"
        path={`${ws.root}/configs/designs/tiles/`}
        files={tileFiles}
      />

      {/* Scala targets —— 三个不可绕过的 target */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <h3 className="mb-3 font-medium text-fg-primary text-sm">Scala Targets</h3>
        <p className="mb-3 text-fg-tertiary text-[11px]">
          三个 target 都得改,缺一个就 build 不起来。chip-designer skill 强制要求。
        </p>
        <ul className="flex flex-col gap-1.5 font-mono text-fg-secondary text-xs">
          <TargetRow path={`arch/src/main/scala/framework/system/core/seed/${ws.chip}/CustomConfigs.scala`} />
          <TargetRow path={`arch/src/main/scala/framework/system/sims/verilator/TargetConfigs.scala`} />
          <TargetRow path={`arch/src/main/scala/framework/system/sims/p2e/TargetConfigs.scala`} />
        </ul>
      </section>

      {/* cores 被 chip 引用 */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <h3 className="mb-3 font-medium text-fg-primary text-sm">Cores</h3>
        <div className="flex flex-wrap gap-2">
          {ws.cores.map((core) => (
            <span
              key={core}
              className="rounded-md border border-border-default bg-canvas px-2.5 py-1 font-mono text-fg-primary text-xs"
            >
              {core}
            </span>
          ))}
        </div>
      </section>

      {/* TODO banner */}
      <section className="rounded-lg border border-border-default border-dashed bg-canvas p-4">
        <h3 className="mb-2 font-medium text-fg-secondary text-xs uppercase tracking-wide">
          Next
        </h3>
        <ul className="space-y-1 text-fg-tertiary text-xs">
          <li>· 接 trpc 读真实 toml 内容 + smol-toml 解析(展示 topology 视图)</li>
          <li>· 加 tile → core 引用图,可视化 inter-core SharedMem contract</li>
          <li>· 每个 target 文件旁加 edit 按钮,跳到对应 git blob</li>
        </ul>
      </section>
    </div>
  );
}

function ConfigBlock({
  icon,
  title,
  subtitle,
  path,
  content,
  files,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  path: string;
  content?: string;
  files?: string[];
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-border-default bg-surface">
      <header className="flex items-center gap-2 border-border-default border-b px-4 py-2.5">
        <span className="text-fg-tertiary">{icon}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="font-mono font-medium text-fg-primary text-sm">{title}</span>
          <span className="text-fg-tertiary text-[11px]">{subtitle}</span>
        </div>
        <span className="truncate font-mono text-fg-disabled text-[11px]">{path}</span>
      </header>
      {content !== undefined && (
        <pre className="overflow-x-auto bg-canvas px-4 py-3 font-mono text-fg-secondary text-xs leading-relaxed">
          {content}
        </pre>
      )}
      {files !== undefined && (
        <ul className="flex flex-col">
          {files.map((f) => (
            <li
              key={f}
              className="flex items-center gap-2 border-border-default border-t px-4 py-1.5 font-mono text-fg-secondary text-xs first:border-t-0"
            >
              <FileCode2 className="size-[11px] text-fg-tertiary" />
              <span className="truncate">{f}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TargetRow({ path }: { path: string }): React.JSX.Element {
  return (
    <li className="flex items-center gap-2">
      <Folder className="size-[12px] text-fg-tertiary" />
      <span className="truncate">{path}</span>
    </li>
  );
}

function renderChipToml(ws: WorkspaceInfo): string {
  // 假装渲染 chip.toml 内容 —— 真数据等 toml parser
  return `# ${ws.chip}/configs/chip.toml
[designs]
${ws.designs.map((d) => `${d.split('/').pop()?.replace('.toml', '')} = "${d}"`).join('\n')}

[cores]
${ws.cores.map((c) => `${c} = "examples/cores/${c}/configs/default.toml"`).join('\n')}

[simulation]
verilator = "sims/verilator/TargetConfigs.scala"
p2e        = "sims/p2e/TargetConfigs.scala"
`;
}