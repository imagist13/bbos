/**
 * EDAPage —— EDA 工作台 (`/eda` 路由)。
 *
 * v0.4 布局 —— 顶部 tab + 单页 body,按 skill 维度切 5 个视图:
 *   Overview   ─ 当前 chip + active jobs + skill 入口 + ball stage 总览
 *   Chips      ─ chip 列表 + chip.toml / designs / tiles / scala targets
 *   Balls      ─ ball 列表 + 每个 ball 的 5-stage gate 看板
 *   Waveforms  ─ VCD/FST 列表 + waveform-mcp 调用面板
 *   Advanced   ─ 文件树 + tab + 编辑器("伪 IDE" 布局,接 trpc.eda.*)
 *
 * 数据:
 *   - workspace 路径  ← eda.defaultWorkspace (自动从 buckyball repo 根推断)
 *   - chip / ball / waveform 数据  ← bb-mock(v0.4 阶段 bb-server 缺失)
 *   - Advanced tab   ← trpc.eda.{listFiles, readFile, writeFile}
 *   - 切换到真数据时,只需替换 bb-mock 为 bb-server 调用,store + 页面不动
 *
 * layout:
 *     ┌──────────────────────────────────────────────────────┐
 *     │ TopBar: Home · [BB] EDA Workbench · Tabs · Lang · ⚙  │
 *     └──────────────────────────────────────────────────────┘
 *     ┌──────────────────────────────────────────────────────┐
 *     │                                                      │
 *     │   active tab 内容(各 page 自己负责布局)                │
 *     │                                                      │
 *     └──────────────────────────────────────────────────────┘
 */

import { Cpu, Globe2, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import { trpc } from '../../lib/trpc';
import { type StudioPage, useStudioStore } from '../../state/eda-studio-store';
import { BallsPage } from './edaStudio/pages/BallsPage';
import { ChipsPage } from './edaStudio/pages/ChipsPage';
import { OverviewPage } from './edaStudio/pages/OverviewPage';
import { WaveformsPage } from './edaStudio/pages/WaveformsPage';
import { AdvancedPage } from './edaStudio/pages/AdvancedPage';
import { AgentPanel } from './agent/AgentPanel';

/** 顶部 tab 定义 —— key 是 store key,label 走 i18n。 */
const TAB_KEYS: ReadonlyArray<StudioPage> = [
  'overview',
  'chips',
  'balls',
  'waveforms',
  'advanced',
];

export function EDAPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { i18n, t } = useTranslation();
  const activePage = useStudioStore((s) => s.activePage);
  const setActivePage = useStudioStore((s) => s.setActivePage);
  const workspace = useStudioStore((s) => s.workspace);
  const setWorkspace = useStudioStore((s) => s.setWorkspace);

  // 首次进入自动从 buckyball repo 根推断 workspace —— 不弹 picker
  const defaultWorkspace = trpc.eda.defaultWorkspace.useQuery();
  useEffect(() => {
    if (workspace) return;
    const root = defaultWorkspace.data?.root;
    if (!root) return;
    setWorkspace(root);
  }, [defaultWorkspace.data, workspace, setWorkspace]);

  const toggleLang = (): void => {
    void i18n.changeLanguage(i18n.language.startsWith('zh') ? 'en' : 'zh');
  };
  const isZh = i18n.language.startsWith('zh');

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas text-fg-primary">
      {/* ---- TopBar ---- */}
      <header className="z-50 flex h-12 flex-shrink-0 items-center border-border-default border-b bg-surface px-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate({ to: '/' })}
            className="flex h-7 items-center gap-1 rounded-md px-2 text-fg-secondary text-xs hover:bg-surface-strong hover:text-fg-primary"
          >
            <span>‹</span>
            <span>{t('gui.topbar.home')}</span>
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent font-bold text-fg-on-accent text-xs">
            <Cpu className="size-[14px]" />
          </div>
          <span className="font-semibold text-sm">{t('gui.topbar.edaWorkbench')}</span>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-fg-tertiary text-[10px]">
            v0.5
          </span>
        </div>

        <nav className="ml-6 flex h-full items-center gap-1 border-border-default border-l pl-6">
          {TAB_KEYS.map((key) => {
            const active = activePage === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActivePage(key)}
                className={
                  active
                    ? 'flex h-8 items-center rounded-md bg-elevated px-3 font-medium text-fg-primary text-xs'
                    : 'flex h-8 items-center rounded-md px-3 text-fg-secondary text-xs hover:bg-surface-strong hover:text-fg-primary'
                }
              >
                {t(`gui.topbar.tabs.${key}`)}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {workspace && (
            <span
              title={workspace}
              className="hidden max-w-[420px] rounded-md bg-canvas px-2 py-1 font-mono text-fg-tertiary text-[11px] lg:inline-block"
            >
              {workspace}
            </span>
          )}
          <button
            type="button"
            onClick={toggleLang}
            className="flex items-center gap-1.5 rounded-md border border-border-default bg-canvas px-3 py-1.5 font-medium text-fg-primary text-xs hover:bg-surface-strong"
          >
            <Globe2 className="size-[13px]" />
            {isZh ? t('gui.topbar.langZh') : t('gui.topbar.langEn')}
          </button>
          <button
            type="button"
            aria-label={t('gui.topbar.settings')}
            title={t('gui.topbar.settings')}
            className="flex h-7 w-7 items-center justify-center rounded-md text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Settings className="size-[13px]" />
          </button>
        </div>
      </header>

      {/* ---- Body ---- */}
      <main className="flex min-h-0 flex-1 overflow-hidden">
        <StudioPageHost page={activePage} />
        <AgentPanel />
      </main>
    </div>
  );
}

/** 派发到当前 tab 对应的页面 —— 每页自带 scroll / 内布局。 */
function StudioPageHost({ page }: { page: StudioPage }): React.JSX.Element {
  switch (page) {
    case 'overview':
      return <OverviewPage />;
    case 'chips':
      return <ChipsPage />;
    case 'balls':
      return <BallsPage />;
    case 'waveforms':
      return <WaveformsPage />;
    case 'advanced':
      return <AdvancedPage />;
    default: {
      // exhaustive guard:增加新 tab 时这里 TS 会报错,提示补 switch case
      const _exhaustive: never = page;
      return _exhaustive;
    }
  }
}