import { Link, useNavigate } from '@tanstack/react-router';
import { CalendarClock, ExternalLink, Search, Settings, SquarePen } from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { dropThreadChat } from '../../lib/pi-chat/chats';
import { trpc } from '../../lib/trpc';
import { useCommandPalette } from '../../state/command-palette-store';
import { useSidebarStore } from '../../state/sidebar-store';
import { useUpdateStore } from '../../state/update-store';
import { SbNavItem, SbSection } from './primitives';
import { ThreadRow, useThreadRowActions } from './ThreadRow';
import type { ThreadItem } from './types';

export const Sidebar = memo(function Sidebar(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // One shared set of row mutations for the whole list (see useThreadRowActions).
  const rowActions = useThreadRowActions();
  const openPalette = useCommandPalette((s) => s.setOpen);
  const updateStage = useUpdateStore((s) => s.state.stage);
  const openUpdateDialog = useUpdateStore((s) => s.openDialog);
  const showUpdate =
    updateStage === 'available' || updateStage === 'downloading' || updateStage === 'downloaded';
  const utils = trpc.useUtils();
  const { data: threads, isLoading } = trpc.threads.list.useQuery();
  // Poll the main process for which threads are generating; a small id list, so
  // the interval is cheap (unlike polling message content).
  const { data: running } = trpc.threads.running.useQuery(undefined, { refetchInterval: 2000 });
  // React Query keeps `running` referentially stable across polls when the set
  // is unchanged (structural sharing), so this Set — and every row prop derived
  // from it — stays stable and the memoized rows don't re-render every 2s.
  const runningSet = useMemo(() => new Set(running), [running]);
  // Threads bound to a scheduled task get a hover clock badge. The binding lives
  // on the task (scheduledTasks.threadId), so derive the set from the task list.
  const { data: scheduled } = trpc.scheduled.list.useQuery();
  const scheduledThreadIds = useMemo(
    () => new Set((scheduled ?? []).map((task) => task.threadId).filter(Boolean)),
    [scheduled],
  );

  // BB agent:每个对话都挂在 buckyball 项目下,所以侧栏只显示 BB 项目下的
  // threads。没有 project 选择 / 切换 / 增删的概念 —— 这些入口在通用
  // agent 里才有。`ensureBb` 内部幂等,挂载时调一次拿到当前 BB 项目 id。
  const bbProject = trpc.projects.ensureBb.useQuery();

  // A background run (a scheduled task) has no client mounted to refresh views
  // when it starts or finishes. Watch the polled running set: for every thread
  // whose running state flips, drop its cached Chat and invalidate its messages
  // query so the next open re-seeds fresh (with the run's appended turn) and
  // resumes the live stream — otherwise the stale in-memory Chat shows nothing
  // until a full reload. Also refetch the list so the unread dot surfaces.
  const prevRunning = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(running);
    const prev = prevRunning.current;
    const flipped = [
      ...[...current].filter((id) => !prev.has(id)),
      ...[...prev].filter((id) => !current.has(id)),
    ];
    prevRunning.current = current;
    if (flipped.length === 0) return;
    for (const id of flipped) {
      dropThreadChat(id);
      utils.threads.get.invalidate({ id });
    }
    utils.threads.list.invalidate();
  }, [running, utils]);

  // BB agent 没有"通用对话",侧栏只展示当前 BB 项目下的 threads。旧项目
  // 下残留的 thread 暂时不显示(用户可以从 url 直接打开,或清理掉旧数据)。
  const bbThreads = useMemo(() => {
    const bbId = bbProject.data?.id;
    if (!bbId) return threads ?? [];
    return (threads ?? []).filter((th) => th.projectId === bbId);
  }, [threads, bbProject.data]);

  const renderThread = (thread: ThreadItem): React.JSX.Element => (
    <ThreadRow
      key={thread.id}
      thread={thread}
      running={runningSet.has(thread.id)}
      hasSchedule={scheduledThreadIds.has(thread.id)}
      actions={rowActions}
    />
  );

  return (
    <aside
      className="flex h-full min-h-0 select-none flex-col border-r border-border-default bg-surface"
      // Width comes from AppLayout via the --sidebar-width CSS variable so a
      // resize drag (which updates it every frame) repaints without re-rendering
      // the whole sidebar tree. Kept explicit — not 100% — so collapsing (grid
      // column → 0) clips the sidebar instead of reflowing its contents.
      style={{ width: 'var(--sidebar-width, 260px)' }}
    >
      <div className="bb-agent-titlebar" />

      <nav className="flex shrink-0 flex-col gap-0.5 px-3 pt-2 pb-1">
        <Link
          to="/"
          className="flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-fg-secondary text-sm hover:bg-surface-strong hover:text-fg-primary"
        >
          <SquarePen className="size-[15px] shrink-0" />
          <span className="flex-1 text-left">{t('home.newChat')}</span>
        </Link>
        <SbNavItem
          icon={<Search className="size-[15px] shrink-0" />}
          label={t('sidebar.search')}
          onClick={() => openPalette(true)}
        />
        <Link
          to="/scheduled"
          className="group flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-fg-secondary text-sm hover:bg-surface-strong hover:text-fg-primary"
          activeProps={{
            className:
              'group flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm bg-elevated text-fg-primary [&_svg]:text-accent',
          }}
        >
          <CalendarClock className="size-[15px] shrink-0" />
          <span className="flex-1 text-left">{t('scheduled.title')}</span>
        </Link>
        <SbNavItem
          icon={<ExternalLink className="size-[15px] shrink-0" />}
          label={t('sidebar.openEda')}
          onClick={() => {
            // /eda 是全屏工作台,先收起会话栏,再跳转,避免视觉上叠在一起。
            if (!useSidebarStore.getState().collapsed) {
              useSidebarStore.getState().toggle();
            }
            navigate({ to: '/eda' });
          }}
        />
      </nav>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="px-3 py-1.5 text-fg-disabled text-sm">{t('common.loading')}</div>
        ) : (
          <>
            <SbSection label={t('sidebar.chats')} />
            {bbThreads.length === 0 ? (
              <div className="px-3 py-1.5 text-fg-disabled text-sm">{t('sidebar.noChats')}</div>
            ) : (
              <div className="flex flex-col gap-1">{bbThreads.map(renderThread)}</div>
            )}
          </>
        )}
      </div>

      <div className="shrink-0 border-border-default border-t px-3 py-2">
        <Link
          to="/settings/$section"
          params={{ section: 'general' }}
          className="flex items-center gap-3 rounded-md px-3 py-1.5 text-fg-secondary text-sm hover:bg-surface-strong hover:text-fg-primary"
        >
          <Settings className="size-[15px] shrink-0" />
          <span className="min-w-0 flex-1 truncate">{t('sidebar.settings')}</span>
          {showUpdate && (
            <button
              type="button"
              // The badge lives inside the Settings link; stop the click so it
              // opens the update dialog instead of navigating to Settings.
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openUpdateDialog();
              }}
              className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 font-medium text-accent text-xs hover:bg-accent/20"
            >
              {t('update.entry')}
            </button>
          )}
        </Link>
      </div>
    </aside>
  );
});
