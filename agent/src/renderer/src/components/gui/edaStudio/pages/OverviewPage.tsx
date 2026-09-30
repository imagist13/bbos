/**
 * OverviewPage —— EDA 工作台首页。
 *
 * 布局(单列 scroll):
 *   ┌──────────────────────────────────────────┐
 *   │ 当前 chip + 切换 dropdown                  │
 *   ├──────────────────────────────────────────┤
 *   │ Active Jobs  (running/queued,实时刷新)     │
 *   ├──────────────────────────────────────────┤
 *   │ Skill 入口卡 × 4                          │
 *   │   chip-designer | ball-align | waveform   │
 *   │   file-explorer(抽屉)                     │
 *   ├──────────────────────────────────────────┤
 *   │ Ball 阶段总览(top 5 个 ball 的 5-stage)    │
 *   └──────────────────────────────────────────┘
 *
 * 数据:
 *   - 当前 chip / chips 列表  ← bb-mock.MOCK_CHIPS
 *   - jobs                    ← bb-mock.MOCK_JOBS (running + 最近 success/failed)
 *   - balls stage 状态         ← bb-mock.MOCK_BALLS
 *
 * v0.4 mock 数据,bb-server 落地后换成真 fetch。
 */

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock,
  Cpu,
  FileSearch,
  FolderTree,
  Loader2,
  MinusCircle,
  Waves,
  XCircle,
} from 'lucide-react';

import { MOCK_BALLS, MOCK_CHIPS, MOCK_JOBS, type JobInfo, type StageStatus } from '../bb-mock';
import { useStudioStore } from '../../../../state/eda-studio-store';

const STAGE_LABELS = ['Contract', 'C+BEMU', 'Compiler+MLIR', 'RTL', 'PPA+UVM'] as const;

export function OverviewPage(): React.JSX.Element {
  const currentChip = useStudioStore((s) => s.currentChip);
  const setCurrentChip = useStudioStore((s) => s.setCurrentChip);

  // 第一次进 Overview,默认选 toy(最小配置,适合看完整 ball 列表)。
  // useEffect 避免 SSR 状态不一致,虽然我们不是 SSR。
  // 这里用惰性初始化:useStudioStore 拿不到时静默 fallback。
  const effectiveChip = currentChip ?? 'toy';

  const runningJobs = MOCK_JOBS.filter(
    (j) => j.status === 'running' || j.status === 'queued',
  );
  const recentJobs = MOCK_JOBS.filter((j) => j.status !== 'running' && j.status !== 'queued').slice(0, 3);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl text-fg-primary">Overview</h1>
        <div className="flex items-center gap-3">
          <label className="text-fg-secondary text-sm">当前 chip:</label>
          <select
            value={effectiveChip}
            onChange={(e) => setCurrentChip(e.target.value)}
            className="rounded-md border border-border-default bg-surface px-3 py-1.5 font-medium text-fg-primary text-sm focus:border-accent focus:outline-none"
          >
            {MOCK_CHIPS.map((chip) => (
              <option key={chip} value={chip}>
                {chip}
              </option>
            ))}
          </select>
          <span className="text-fg-disabled text-xs">
            ({MOCK_CHIPS.length} chips · bb-server mock)
          </span>
        </div>
      </header>

      {/* Active Jobs —— 用户最关心的"现在在跑什么" */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-fg-primary text-sm">
            <Activity className="size-[14px]" /> Active Jobs
            {runningJobs.length > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-accent text-[11px]">
                {runningJobs.length}
              </span>
            )}
          </h2>
          <span className="text-fg-disabled text-[11px]">trace_id poll · 1s</span>
        </div>
        {runningJobs.length === 0 ? (
          <p className="text-fg-tertiary text-xs">No running jobs. 切到 Balls 页选一个 ball 跑起来。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {runningJobs.map((job) => (
              <RunningJobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
        {recentJobs.length > 0 && (
          <div className="mt-3 border-border-default border-t pt-3">
            <div className="mb-2 text-fg-tertiary text-[11px] uppercase tracking-wide">Recent</div>
            <ul className="flex flex-col gap-1.5">
              {recentJobs.map((job) => (
                <RecentJobRow key={job.id} job={job} />
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Skill 入口卡 —— 4 个,一键进对应工作流 */}
      <section>
        <h2 className="mb-3 font-medium text-fg-primary text-sm">Workflows</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkillCard
            icon={<Cpu className="size-[16px]" />}
            title="chip-designer"
            subtitle="设计 / 修改一个 chip 的 topology"
            description="解释为什么现有 chip 不匹配 → 选 topology → 写 chip.toml / designs/*.toml / tiles/*.toml"
            targetPage="chips"
          />
          <SkillCard
            icon={<Boxes className="size-[16px]" />}
            title="ball-align"
            subtitle="5-stage gate pipeline"
            description="Contract → C+BEMU → Compiler+MLIR → RTL → PPA+UVM。上一节未绿,下一节不能走。"
            targetPage="balls"
          />
          <SkillCard
            icon={<Waves className="size-[16px]" />}
            title="waveform"
            subtitle="VCD / FST cycle-level 调试"
            description="open_waveform → list_signals → find_*_events / read_signal。注意时间是采样点,不是 clock。"
            targetPage="waveforms"
          />
          <SkillCard
            icon={<FolderTree className="size-[16px]" />}
            title="file-explorer"
            subtitle="直接编辑 toml / scala"
            description="examples/chips/<chip>/configs/ 树形浏览,advanced 用户用。"
            targetPage="overview"
            opensFileDrawer
          />
        </div>
      </section>

      {/* Ball stage 总览 —— 让用户一眼看到哪些 ball 卡在哪 */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-fg-primary text-sm">Ball Stage Overview</h2>
          <span className="text-fg-disabled text-[11px]">{MOCK_BALLS.length} balls · 5-stage gate</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-fg-tertiary">
                <th className="px-2 py-1 text-left font-medium">ball</th>
                <th className="px-2 py-1 text-left font-medium">core</th>
                {STAGE_LABELS.map((label) => (
                  <th key={label} className="px-2 py-1 text-center font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MOCK_BALLS.slice(0, 6).map((ball) => (
                <tr key={ball.name} className="border-border-default border-t">
                  <td className="px-2 py-1.5 font-mono font-medium text-fg-primary">{ball.name}</td>
                  <td className="px-2 py-1.5 text-fg-secondary">{ball.core}</td>
                  {ball.stages.map((s) => (
                    <td key={s.stage} className="px-2 py-1.5 text-center">
                      <StageDot status={s.status} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center gap-3 text-fg-tertiary text-[11px]">
          <span className="flex items-center gap-1">
            <StageDot status="green" /> green
          </span>
          <span className="flex items-center gap-1">
            <StageDot status="red" /> red (block)
          </span>
          <span className="flex items-center gap-1">
            <StageDot status="gray" /> gray (上游未绿)
          </span>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 组件
// ---------------------------------------------------------------------------

function RunningJobRow({ job }: { job: JobInfo }): React.JSX.Element {
  return (
    <li className="flex items-center gap-3 rounded-md border border-border-default bg-canvas px-3 py-2">
      <Loader2 className="size-[14px] animate-spin text-accent" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-fg-primary text-xs">{job.command}</span>
        </div>
        <div className="flex items-center gap-2 text-fg-tertiary text-[11px]">
          <span className="font-mono">{job.id}</span>
          <span>·</span>
          <span>chip={job.chip}</span>
          <span>·</span>
          <Clock className="size-[11px]" />
          <span>{formatAge(job.createdAt)}</span>
        </div>
      </div>
    </li>
  );
}

function RecentJobRow({ job }: { job: JobInfo }): React.JSX.Element {
  const StatusIcon =
    job.status === 'success' ? CheckCircle2 : job.status === 'failed' ? XCircle : MinusCircle;
  const color =
    job.status === 'success'
      ? 'text-status-success'
      : job.status === 'failed'
        ? 'text-status-danger'
        : 'text-fg-tertiary';
  return (
    <li className="flex items-center gap-2 text-fg-tertiary text-xs">
      <StatusIcon className={`size-[12px] ${color}`} />
      <span className="font-mono text-fg-secondary text-[11px]">{job.id}</span>
      <span className="truncate">{job.command}</span>
      <span className="ml-auto text-fg-disabled text-[11px]">{formatAge(job.finishedAt ?? job.createdAt)}</span>
    </li>
  );
}

function SkillCard({
  icon,
  title,
  subtitle,
  description,
  targetPage,
  opensFileDrawer = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  description: string;
  targetPage: 'overview' | 'chips' | 'balls' | 'waveforms';
  opensFileDrawer?: boolean;
}): React.JSX.Element {
  const setActivePage = useStudioStore((s) => s.setActivePage);
  return (
    <button
      type="button"
      onClick={() => setActivePage(targetPage)}
      className="group flex flex-col gap-2 rounded-lg border border-border-default bg-surface p-4 text-left transition-colors hover:border-accent/50 hover:bg-surface-strong"
    >
      <div className="flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <span className="font-mono font-medium text-fg-primary text-sm">{title}</span>
        <ArrowRight className="ml-auto size-[12px] text-fg-disabled transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <div className="font-medium text-fg-secondary text-xs">{subtitle}</div>
      <p className="text-fg-tertiary text-[11px] leading-relaxed">{description}</p>
      {opensFileDrawer && (
        <span className="mt-1 flex items-center gap-1 text-accent text-[11px]">
          <FileSearch className="size-[11px]" /> 打开文件抽屉
        </span>
      )}
    </button>
  );
}

function StageDot({ status }: { status: StageStatus }): React.JSX.Element {
  if (status === 'green') {
    return <CheckCircle2 className="mx-auto size-[14px] text-status-success" />;
  }
  if (status === 'red') {
    return <AlertTriangle className="mx-auto size-[14px] text-status-danger" />;
  }
  return <CircleDot className="mx-auto size-[14px] text-fg-disabled" />;
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function formatAge(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

// re-exported so EDAPage can use it without re-implementing
export { ChevronRight };