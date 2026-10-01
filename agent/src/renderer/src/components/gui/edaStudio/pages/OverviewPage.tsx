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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

import { MOCK_BALLS, MOCK_CHIPS, MOCK_JOBS, type JobInfo, type StageStatus } from '../bb-mock';
import { useStudioStore } from '../../../../state/eda-studio-store';

/**
 * 5 stage 名,跟 i18n key `gui.balls.stages` 对齐 —— 同 i18n key 既给 BallsPage 用
 * 也给这里表头用,避免 Stage label 在两处各写一份。
 */
const STAGE_KEYS = ['contract', 'cbemu', 'compiler', 'rtl', 'ppauvm'] as const;

export function OverviewPage(): React.JSX.Element {
  const { t } = useTranslation();
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
    <div className="flex w-full min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-semibold text-2xl text-fg-primary">{t('gui.overview.title')}</h1>
        <div className="flex items-center gap-3">
          <label className="text-fg-secondary text-sm">{t('gui.overview.currentChip')}:</label>
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
            ({t('gui.overview.chipsCount', { count: MOCK_CHIPS.length })})
          </span>
        </div>
      </header>

      {/* Active Jobs —— 用户最关心的"现在在跑什么" */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-medium text-fg-primary text-sm">
            <Activity className="size-[14px]" /> {t('gui.overview.activeJobs')}
            {runningJobs.length > 0 && (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-accent text-[11px]">
                {runningJobs.length}
              </span>
            )}
          </h2>
          <span className="text-fg-disabled text-[11px]">{t('gui.overview.traceIdPoll')}</span>
        </div>
        {runningJobs.length === 0 ? (
          <p className="text-fg-tertiary text-xs">{t('gui.overview.noRunningJobs')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {runningJobs.map((job) => (
              <RunningJobRow key={job.id} job={job} />
            ))}
          </ul>
        )}
        {recentJobs.length > 0 && (
          <div className="mt-3 border-border-default border-t pt-3">
            <div className="mb-2 text-fg-tertiary text-[11px] uppercase tracking-wide">
              {t('gui.common.recent')}
            </div>
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
        <h2 className="mb-3 font-medium text-fg-primary text-sm">{t('gui.overview.workflows')}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SkillCard
            icon={<Cpu className="size-[16px]" />}
            skillKey="chipDesigner"
            targetPage="chips"
          />
          <SkillCard
            icon={<Boxes className="size-[16px]" />}
            skillKey="ballAlign"
            targetPage="balls"
          />
          <SkillCard
            icon={<Waves className="size-[16px]" />}
            skillKey="waveform"
            targetPage="waveforms"
          />
          <SkillCard
            icon={<FolderTree className="size-[16px]" />}
            skillKey="fileExplorer"
            targetPage="overview"
          />
        </div>
      </section>

      {/* Ball stage 总览 —— 让用户一眼看到哪些 ball 卡在哪 */}
      <section className="rounded-lg border border-border-default bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-medium text-fg-primary text-sm">{t('gui.overview.ballStageOverview')}</h2>
          <span className="text-fg-disabled text-[11px]">
            {t('gui.overview.ballsCount', { count: MOCK_BALLS.length })}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-fg-tertiary">
                <th className="px-2 py-1 text-left font-medium">ball</th>
                <th className="px-2 py-1 text-left font-medium">core</th>
                {STAGE_KEYS.map((key) => (
                  <th key={key} className="px-2 py-1 text-center font-medium">
                    {t(`gui.balls.stages.${key}`)}
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
            <StageDot status="green" /> {t('gui.overview.stageLegend.green')}
          </span>
          <span className="flex items-center gap-1">
            <StageDot status="red" /> {t('gui.overview.stageLegend.red')}
          </span>
          <span className="flex items-center gap-1">
            <StageDot status="gray" /> {t('gui.overview.stageLegend.gray')}
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
  const { t } = useTranslation();
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
          <span>{formatAge(t, job.createdAt)}</span>
        </div>
      </div>
    </li>
  );
}

function RecentJobRow({ job }: { job: JobInfo }): React.JSX.Element {
  const { t } = useTranslation();
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
      <span className="ml-auto text-fg-disabled text-[11px]">
        {formatAge(t, job.finishedAt ?? job.createdAt)}
      </span>
    </li>
  );
}

type SkillKey = 'chipDesigner' | 'ballAlign' | 'waveform' | 'fileExplorer';

function SkillCard({
  icon,
  skillKey,
  targetPage,
}: {
  icon: React.ReactNode;
  skillKey: SkillKey;
  targetPage: 'overview' | 'chips' | 'balls' | 'waveforms';
}): React.JSX.Element {
  const { t } = useTranslation();
  const setActivePage = useStudioStore((s) => s.setActivePage);
  return (
    <button
      type="button"
      onClick={() => setActivePage(targetPage)}
      className="group flex flex-col gap-2 rounded-lg border border-border-default bg-surface p-4 text-left transition-colors hover:border-accent/50 hover:bg-surface-strong"
    >
      <div className="flex items-center gap-2">
        <span className="text-accent">{icon}</span>
        <span className="font-mono font-medium text-fg-primary text-sm">
          {t(`gui.overview.skills.${skillKey}.title`)}
        </span>
        <ArrowRight className="ml-auto size-[12px] text-fg-disabled transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <div className="font-medium text-fg-secondary text-xs">
        {t(`gui.overview.skills.${skillKey}.subtitle`)}
      </div>
      <p className="text-fg-tertiary text-[11px] leading-relaxed">
        {t(`gui.overview.skills.${skillKey}.description`)}
      </p>
      {skillKey === 'fileExplorer' && (
        <span className="mt-1 flex items-center gap-1 text-accent text-[11px]">
          <FileSearch className="size-[11px]" /> {t('gui.overview.skills.fileExplorer.openDrawer')}
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

/** 复用 i18n 把 "Xs/Xm/Xh/Xd ago" 走 gui.common.agoShort。 */
function formatAge(t: TFunction, iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const n = Math.floor(ms / 1000);
  if (ms < 60_000) return t('gui.common.agoShort.seconds', { n });
  if (ms < 3_600_000) return t('gui.common.agoShort.minutes', { n: Math.floor(ms / 60_000) });
  if (ms < 86_400_000) return t('gui.common.agoShort.hours', { n: Math.floor(ms / 3_600_000) });
  return t('gui.common.agoShort.days', { n: Math.floor(ms / 86_400_000) });
}

// re-exported so EDAPage can use it without re-implementing
export { ChevronRight };