/**
 * WaveformsPage —— VCD/FST 文件列表 + waveform-mcp 调用面板。
 *
 * 布局(左 320 + 右):
 *   ┌────────────────┬────────────────────────────┐
 *   │ 文件列表        │ 当前 waveform 详情         │
 *   │ - vcd/fst      │  path · chip · size        │
 *   │ - filter by    │  open_waveform call        │
 *   │   chip/format  │  ───                       │
 *   │                │  list_signals (placeholder)│
 *   │                │  ───                       │
 *   │                │  find_*_events / read_signal│
 *   │                │  ───                       │
 *   │                │  检查项提示                │
 *   └────────────────┴────────────────────────────┘
 *
 * waveform-mcp 调用面板是 stub —— 真接 MCP 走 bbdev 那条工具链。
 * 关键约束(来自 waveform SKILL.md):
 *   - time_index 是 simulator 采样点,**不是** clock cycle。要先 find clock 边沿。
 *   - list_signals 要显式传 recursive=true/false,不依赖默认。
 *   - 用 find_conditional_events 检查 handshake (cmdReq.valid && ready)。
 */

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Filter,
  Play,
  Search,
  Waves,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { MOCK_WAVEFORMS, type WaveformFile } from '../bb-mock';

export function WaveformsPage(): React.JSX.Element {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<WaveformFile | null>(null);
  const [chipFilter, setChipFilter] = useState<string>('all');
  const [formatFilter, setFormatFilter] = useState<'all' | 'vcd' | 'fst'>('all');

  // 第一次进,默认选第一个
  useEffect(() => {
    if (!selected && MOCK_WAVEFORMS.length > 0) setSelected(MOCK_WAVEFORMS[0] ?? null);
  }, [selected]);

  const chips = Array.from(new Set(MOCK_WAVEFORMS.map((w) => w.chip)));
  const filtered = MOCK_WAVEFORMS.filter(
    (w) =>
      (chipFilter === 'all' || w.chip === chipFilter) &&
      (formatFilter === 'all' || w.format === formatFilter),
  );

  return (
    <div className="flex h-full w-full min-h-0 grow flex-row">
      {/* 左侧文件列表 */}
      <aside className="flex w-80 flex-shrink-0 flex-col overflow-hidden border-border-default border-r bg-surface">
        <div className="border-border-default border-b px-4 py-3">
          <h2 className="font-medium text-fg-primary text-sm">{t('gui.waveforms.title')}</h2>
          <p className="mt-0.5 text-fg-tertiary text-[11px]">
            {t('gui.waveforms.count', { count: MOCK_WAVEFORMS.length })}
          </p>
          {/* filter */}
          <div className="mt-3 flex gap-2">
            <FilterSelect
              label={t('gui.waveforms.filterChip')}
              value={chipFilter}
              options={['all', ...chips]}
              onChange={setChipFilter}
            />
            <FilterSelect
              label={t('gui.waveforms.filterFmt')}
              value={formatFilter}
              options={['all', 'vcd', 'fst']}
              onChange={setFormatFilter}
            />
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto">
          {filtered.map((w) => {
            const active = selected?.path === w.path;
            return (
              <li key={w.path}>
                <button
                  type="button"
                  onClick={() => setSelected(w)}
                  className={
                    active
                      ? 'flex w-full items-start gap-2 border-l-2 border-accent bg-accent/10 px-4 py-2 text-left'
                      : 'flex w-full items-start gap-2 border-l-2 border-transparent px-4 py-2 text-left hover:bg-surface-strong'
                  }
                >
                  <Waves className="mt-0.5 size-[13px] text-fg-tertiary" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate font-mono text-fg-primary text-xs">
                      {w.path.split('/').pop()}
                    </span>
                    <div className="flex items-center gap-1.5 text-fg-tertiary text-[10px]">
                      <span className="uppercase">{w.format}</span>
                      <span>·</span>
                      <span>chip={w.chip}</span>
                      {w.simTimeNs && (
                        <>
                          <span>·</span>
                          <span>{(w.simTimeNs / 1000).toFixed(1)} µs</span>
                        </>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-6 text-center text-fg-tertiary text-xs">
              {t('gui.waveforms.noMatches')}
            </li>
          )}
        </ul>
      </aside>

      {/* 右侧 detail */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-fg-tertiary text-sm">
            {t('gui.waveforms.pickOne')}
          </div>
        ) : (
          <WaveformDetail wf={selected} />
        )}
      </main>
    </div>
  );
}

function WaveformDetail({ wf }: { wf: WaveformFile }): React.JSX.Element {
  const { t } = useTranslation();
  const sizeKb = (wf.sizeBytes / 1024).toFixed(0);
  const calls = (key: 'open' | 'list' | 'findCond' | 'findSig' | 'read' | 'close') => {
    const c = t(`gui.waveforms.calls.${key}`, { returnObjects: true }) as {
      label: string;
      args: string;
      desc: string;
    };
    return c;
  };
  return (
    <div className="flex w-full min-w-0 grow flex-col items-stretch gap-6 self-stretch px-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Waves className="size-[18px] text-accent" />
          <h1 className="font-mono font-semibold text-fg-primary text-xl">
            {wf.path.split('/').pop()}
          </h1>
          <span className="rounded-full bg-elevated px-2 py-0.5 font-mono text-fg-tertiary text-[10px] uppercase">
            {wf.format}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-fg-tertiary text-xs">
          <span className="font-mono">{wf.path}</span>
        </div>
        <div className="flex items-center gap-3 text-fg-tertiary text-xs">
          <span>chip={wf.chip}</span>
          <span>·</span>
          <span>{sizeKb} KB</span>
          {wf.simTimeNs && (
            <>
              <span>·</span>
              <span>{wf.simTimeNs.toLocaleString()} ns</span>
            </>
          )}
          <span>·</span>
          <span>{t('gui.waveforms.modifiedAt', { time: formatAge(t, wf.modifiedAt) })}</span>
        </div>
      </header>

      {/* waveform-mcp 调用面板 —— UI 展示,实际触发等真接 MCP */}
      <section className="rounded-lg border border-border-default bg-surface">
        <header className="flex items-center gap-2 border-border-default border-b px-4 py-2.5">
          <Play className="size-[14px] text-accent" />
          <h3 className="font-medium text-fg-primary text-sm">{t('gui.waveforms.mcpCalls')}</h3>
          <span className="ml-auto rounded-full bg-status-warning/15 px-2 py-0.5 text-[10px] text-status-warning uppercase">
            {t('gui.waveforms.mcpMock')}
          </span>
        </header>
        <ul className="flex flex-col">
          <McpCallRow
            label={calls('open').label}
            args={t('gui.waveforms.calls.open.args', { path: wf.path })}
            desc={calls('open').desc}
          />
          <McpCallRow label={calls('list').label} args={calls('list').args} desc={calls('list').desc} />
          <McpCallRow
            label={calls('findCond').label}
            args={calls('findCond').args}
            desc={calls('findCond').desc}
          />
          <McpCallRow
            label={calls('findSig').label}
            args={calls('findSig').args}
            desc={calls('findSig').desc}
          />
          <McpCallRow
            label={calls('read').label}
            args={calls('read').args}
            desc={calls('read').desc}
          />
          <McpCallRow
            label={calls('close').label}
            args={calls('close').args}
            desc={calls('close').desc}
          />
        </ul>
      </section>

      {/* 检查项提示 —— 来自 waveform skill */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <h3 className="mb-3 flex items-center gap-2 font-medium text-fg-primary text-sm">
          <AlertCircle className="size-[14px] text-status-warning" />
          {t('gui.waveforms.checksTitle')}
        </h3>
        <ul className="space-y-1.5 text-fg-secondary text-xs">
          {t('gui.waveforms.checks', { returnObjects: true }).map((c: { signal: string; desc: string }, i: number) => (
            <li key={i}>
              <span className="font-mono text-fg-primary">{c.signal}</span> — {c.desc}
            </li>
          ))}
        </ul>
      </section>

      {/* TODO banner */}
      <section className="rounded-lg border border-border-default border-dashed bg-canvas p-4">
        <h3 className="mb-2 font-medium text-fg-secondary text-xs uppercase tracking-wide">
          {t('gui.waveforms.next')}
        </h3>
        <ul className="space-y-1 text-fg-tertiary text-xs">
          {t('gui.waveforms.nextItems', { returnObjects: true }).map((item: string, i: number) => (
            <li key={i}>· {item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function McpCallRow({
  label,
  args,
  desc,
}: {
  label: string;
  args: string;
  desc: string;
}): React.JSX.Element {
  return (
    <li className="flex flex-col gap-1 border-border-default border-t px-4 py-2.5 first:border-t-0">
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium text-fg-primary text-xs">{label}</span>
        <span className="font-mono text-fg-tertiary text-[11px]">{args}</span>
      </div>
      <p className="text-fg-tertiary text-[11px] leading-relaxed">{desc}</p>
    </li>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<T>;
  onChange: (v: T) => void;
}): React.JSX.Element {
  return (
    <label className="flex flex-1 items-center gap-1.5 rounded-md border border-border-default bg-canvas px-2 py-1">
      <Filter className="size-[11px] text-fg-tertiary" />
      <span className="text-fg-tertiary text-[11px]">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="flex-1 bg-transparent text-fg-primary text-xs focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function formatTime(t: TFunction, iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return t('gui.common.agoShort.seconds', { n: Math.floor(ms / 1000) });
  if (ms < 3_600_000) return t('gui.common.agoShort.minutes', { n: Math.floor(ms / 60_000) });
  if (ms < 86_400_000) return t('gui.common.agoShort.hours', { n: Math.floor(ms / 3_600_000) });
  return t('gui.common.agoShort.days', { n: Math.floor(ms / 86_400_000) });
}

// backwards-compat alias while file evolves
const formatAge = formatTime;

// re-export Search so it can be picked up by tooling that scans for unused imports
export { Search };