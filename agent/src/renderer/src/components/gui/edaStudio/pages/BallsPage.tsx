/**
 * BallsPage —— Ball 列表 + 每个 ball 的 5-stage gate 看板。
 *
 * 核心:ball-align skill 的强制规则 —— 上游 stage 未绿,下游 stage 必灰。
 * UI 上用 5 列展示 5 个 stage,每列是个 status pill(green/red/gray)+ note。
 *
 * 布局:
 *   ┌──────────────┬──────────────────────────────────────────┐
 *   │ ball 列表    │ 当前 ball 的 5-stage gate view           │
 *   │ (240px)      │ 顶部:stage 0-4 横排圆点 + label          │
 *   │              │ 中间:每 stage 的 note + 最近一次 evidence │
 *   │              │ 底部:本 ball 的 jobs + VCD 链接          │
 *   └──────────────┴──────────────────────────────────────────┘
 *
 * 数据:MOCK_BALLS(每个 ball 5 个 stage,带 status + note)。
 */

import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  CircleDot,
  Clock,
  ExternalLink,
  Loader2,
  XCircle,
} from 'lucide-react';
import { useEffect } from 'react';

import { MOCK_BALLS, MOCK_JOBS, type BallInfo, type StageStatus } from '../bb-mock';
import { useStudioStore } from '../../../../state/eda-studio-store';

const STAGE_LABELS = [
  { idx: 0, label: 'Contract', desc: 'ISA + element width + layout contract' },
  { idx: 1, label: 'C+BEMU', desc: 'C test + BEMU golden model' },
  { idx: 2, label: 'Compiler+MLIR', desc: 'MLIR test on BEMU' },
  { idx: 3, label: 'RTL', desc: 'Verilator small tests' },
  { idx: 4, label: 'PPA+UVM', desc: 'PPA + UVM verification' },
] as const;

export function BallsPage(): React.JSX.Element {
  const currentBall = useStudioStore((s) => s.currentBall);
  const setCurrentBall = useStudioStore((s) => s.setCurrentBall);

  // 第一次进 BallsPage,默认选 gemmini(production 核最有代表性的 ball)
  useEffect(() => {
    if (!currentBall) setCurrentBall('gemmini');
  }, [currentBall, setCurrentBall]);

  const ball = MOCK_BALLS.find((b) => b.name === currentBall);

  return (
    <div className="flex h-full min-h-0">
      {/* 左侧 ball 列表 */}
      <aside className="flex w-60 flex-shrink-0 flex-col overflow-y-auto border-border-default border-r bg-surface">
        <div className="border-border-default border-b px-4 py-3">
          <h2 className="font-medium text-fg-primary text-sm">Balls</h2>
          <p className="mt-0.5 text-fg-tertiary text-[11px]">
            {MOCK_BALLS.length} 个 · 5-stage gate
          </p>
        </div>
        <ul className="flex flex-col">
          {MOCK_BALLS.map((b) => {
            const active = b.name === currentBall;
            const worstStatus = worstStage(b);
            return (
              <li key={b.name}>
                <button
                  type="button"
                  onClick={() => setCurrentBall(b.name)}
                  className={
                    active
                      ? 'flex w-full items-center gap-2 border-l-2 border-accent bg-accent/10 px-4 py-2 text-left'
                      : 'flex w-full items-center gap-2 border-l-2 border-transparent px-4 py-2 text-left hover:bg-surface-strong'
                  }
                >
                  <Boxes className="size-[13px] text-fg-tertiary" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-medium text-fg-primary text-xs">{b.name}</span>
                      <StageDotMini status={worstStatus} />
                    </div>
                    <span className="truncate text-fg-tertiary text-[10px]">
                      core: {b.core}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </aside>

      {/* 右侧 ball detail */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        {!ball ? (
          <div className="flex flex-1 items-center justify-center text-fg-tertiary text-sm">
            选一个 ball 看 5-stage gate。
          </div>
        ) : (
          <BallDetail ball={ball} />
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BallDetail({ ball }: { ball: BallInfo }): React.JSX.Element {
  const setActivePage = useStudioStore((s) => s.setActivePage);
  const ballJobs = MOCK_JOBS.filter((j) => j.command?.includes(ball.name) ?? false);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-6">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Boxes className="size-[18px] text-accent" />
          <h1 className="font-mono font-semibold text-fg-primary text-xl">{ball.name}</h1>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-fg-tertiary text-[10px] uppercase">
            core: {ball.core}
          </span>
          {ball.core === 'toy' && (
            <span className="rounded-full bg-status-warning/15 px-2 py-0.5 text-[10px] text-status-warning uppercase">
              maintenance core
            </span>
          )}
        </div>
        <p className="text-fg-tertiary text-xs">
          5-stage gate pipeline.上一节未绿,下一节不能走(ball-align skill 强制)。
        </p>
      </header>

      {/* 5-stage 横排大圆点 */}
      <section className="rounded-lg border border-border-default bg-surface p-5">
        <div className="flex items-center justify-between">
          {ball.stages.map((s, i) => (
            <div key={s.stage} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={
                    s.status === 'green'
                      ? 'flex size-12 items-center justify-center rounded-full bg-status-success/15 ring-2 ring-status-success'
                      : s.status === 'red'
                        ? 'flex size-12 items-center justify-center rounded-full bg-status-danger/15 ring-2 ring-status-danger'
                        : 'flex size-12 items-center justify-center rounded-full bg-elevated ring-2 ring-border-default'
                  }
                >
                  <StageGlyph status={s.status} />
                </div>
                <span className="font-mono font-medium text-fg-primary text-xs">
                  S{s.stage}
                </span>
                <span className="text-fg-tertiary text-[11px]">
                  {STAGE_LABELS[i]?.label}
                </span>
              </div>
              {i < ball.stages.length - 1 && (
                <div
                  className={
                    ball.stages[i + 1]?.status === 'gray'
                      ? 'mx-2 h-0.5 flex-1 bg-border-default'
                      : 'mx-2 h-0.5 flex-1 bg-accent/40'
                  }
                />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 每个 stage 的详情卡 */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        {ball.stages.map((s, i) => {
          const label = STAGE_LABELS[i];
          if (!label) return null;
          return (
            <StageCard
              key={s.stage}
              label={label.label}
              desc={label.desc}
              status={s.status}
              note={s.note}
            />
          );
        })}
      </section>

      {/* 本 ball 的 jobs */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-medium text-fg-primary text-sm">Jobs for {ball.name}</h3>
          <button
            type="button"
            onClick={() => setActivePage('waveforms')}
            className="flex items-center gap-1 text-accent text-xs hover:underline"
          >
            <ExternalLink className="size-[12px]" /> Waveforms
          </button>
        </div>
        {ballJobs.length === 0 ? (
          <p className="text-fg-tertiary text-xs">没有该 ball 的 jobs。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ballJobs.map((job) => (
              <li
                key={job.id}
                className="flex items-center gap-3 rounded-md border border-border-default bg-canvas px-3 py-2"
              >
                {job.status === 'running' ? (
                  <Loader2 className="size-[14px] animate-spin text-accent" />
                ) : job.status === 'success' ? (
                  <CheckCircle2 className="size-[14px] text-status-success" />
                ) : job.status === 'failed' ? (
                  <XCircle className="size-[14px] text-status-danger" />
                ) : (
                  <CircleDot className="size-[14px] text-fg-tertiary" />
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-mono text-fg-primary text-xs">{job.command}</span>
                  <div className="flex items-center gap-2 text-fg-tertiary text-[11px]">
                    <span className="font-mono">{job.id}</span>
                    <span>·</span>
                    <Clock className="size-[11px]" />
                    <span>{formatAge(job.finishedAt ?? job.createdAt)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StageCard({
  label,
  desc,
  status,
  note,
}: {
  label: string;
  desc: string;
  status: StageStatus;
  note?: string;
}): React.JSX.Element {
  const border =
    status === 'green'
      ? 'border-status-success/40 bg-status-success/5'
      : status === 'red'
        ? 'border-status-danger/40 bg-status-danger/5'
        : 'border-border-default bg-canvas';
  const badge =
    status === 'green'
      ? 'bg-status-success/15 text-status-success'
      : status === 'red'
        ? 'bg-status-danger/15 text-status-danger'
        : 'bg-elevated text-fg-tertiary';
  return (
    <div className={`flex flex-col gap-2 rounded-lg border p-3 ${border}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono font-medium text-fg-primary text-xs">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase ${badge}`}>
          {status}
        </span>
      </div>
      <p className="text-fg-tertiary text-[11px] leading-relaxed">{desc}</p>
      {note && <p className="text-fg-secondary text-[11px] leading-relaxed">{note}</p>}
    </div>
  );
}

function StageGlyph({ status }: { status: StageStatus }): React.JSX.Element {
  if (status === 'green') return <CheckCircle2 className="size-6 text-status-success" />;
  if (status === 'red') return <AlertTriangle className="size-6 text-status-danger" />;
  return <CircleDot className="size-6 text-fg-disabled" />;
}

function StageDotMini({ status }: { status: StageStatus }): React.JSX.Element {
  if (status === 'green') return <CheckCircle2 className="size-[12px] text-status-success" />;
  if (status === 'red') return <AlertTriangle className="size-[12px] text-status-danger" />;
  return <CircleDot className="size-[12px] text-fg-disabled" />;
}

// 取最严重的 stage status(red > green > gray)。决定 ball 列表徽章颜色。
function worstStage(ball: BallInfo): StageStatus {
  if (ball.stages.some((s) => s.status === 'red')) return 'red';
  if (ball.stages.some((s) => s.status === 'green')) return 'green';
  return 'gray';
}

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}