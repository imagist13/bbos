/**
 * Home —— BBOS 工作台主页(SPEC §6 Phase B)。
 *
 * 布局:
 * ┌─────────────────────────────────────────────────────────┐
 * │                      AppHeader (48px)                    │
 * ├─── LeftDrawerNav ─── Center ─── RightPanel ─── Collapse │
 * │    (220px)         (flex)      (280px)        (20px)   │
 * └─────────────────────────────────────────────────────────┘
 *
 * 4 个主分区:chip / design / ball / sim。
 * 切主分区 → 默认进入 DEFAULT_SUB_TABS 里登记的子 tab。
 */

import { useEffect, useState } from "react";

import { AppHeader } from "@/components/AppHeader";
import { LeftDrawerNav } from "@/components/LeftDrawerNav";
import { RightPanel } from "@/components/RightPanel";
import { ChipEditor } from "@/components/ChipEditor";
import { DesignEditor } from "@/components/DesignEditor";
import { BallISAEditor } from "@/components/BallISAEditor";
import { Simulator } from "@/components/Simulator";
import { useT } from "@/components/useT";
import { Icons } from "@/components/icons";
import { DEFAULT_SUB_TABS } from "@/components/constants";
import { ThemeProvider } from "@/components/theme-provider";
import { TitleBar } from "@/components/TitleBar";
import { Toaster } from "@/components/ui/sonner";
import type { Lang } from "@/lib/i18n";
import {
  MOCK_BALL_ISA,
  MOCK_CHIP_CONFIG,
  MOCK_DESIGN_CONFIG,
} from "@/lib/mockData";
import type {
  ChipSubTab,
  DesignSubTab,
  HomeSubTab,
  HomeTab,
} from "@/components/types";

export const Home = () => (
  <ThemeProvider defaultTheme="dark">
    <HomeShell />
  </ThemeProvider>
);

const HomeShell = () => {
  const [lang, setLang] = useState<Lang>("zh");
  const [activeTab, setActiveTab] = useState<HomeTab>("chip");
  const [activeSubTab, setActiveSubTab] = useState<HomeSubTab>("chip-config");
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const t = useT(lang);

  // 切换主分区时,重置为对应的默认子 tab
  useEffect(() => {
    setActiveSubTab(DEFAULT_SUB_TABS[activeTab]);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "chip":
        return (
          <ChipEditor
            config={MOCK_CHIP_CONFIG}
            activeSubTab={activeSubTab as ChipSubTab}
            t={t}
          />
        );
      case "design":
        return (
          <DesignEditor
            config={MOCK_DESIGN_CONFIG}
            activeSubTab={activeSubTab as DesignSubTab}
            t={t}
          />
        );
      case "ball":
        return <BallISAEditor data={MOCK_BALL_ISA} t={t} />;
      case "sim":
        return <Simulator t={t} />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <Toaster position="bottom-right" />
      <div className="flex flex-1 flex-col overflow-hidden pt-12">
        <AppHeader lang={lang} onLangChange={setLang} t={t} />

        <div className="flex flex-1 overflow-hidden">
          <LeftDrawerNav
            activeTab={activeTab}
            activeSubTab={activeSubTab}
            onTabChange={setActiveTab}
            onSubTabChange={setActiveSubTab}
            t={t}
          />

          <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
          </main>

          <div
            className="flex flex-shrink-0 overflow-hidden transition-[width] duration-200"
            style={{ width: rightPanelCollapsed ? 0 : 280 }}
          >
            {!rightPanelCollapsed && (
              <RightPanel
                activeTab={activeTab}
                t={t}
                onCollapse={() => setRightPanelCollapsed(true)}
              />
            )}
          </div>

          <button
            onClick={() => setRightPanelCollapsed((c) => !c)}
            aria-label={rightPanelCollapsed ? "Expand panel" : "Collapse panel"}
            className="flex w-5 flex-shrink-0 items-center justify-center border-border bg-sidebar text-muted-foreground transition hover:bg-accent"
            style={{
              borderLeftWidth: rightPanelCollapsed ? 0 : 1,
            }}
          >
            <span
              className="transition-transform duration-200"
              style={{ transform: rightPanelCollapsed ? "rotate(180deg)" : "none" }}
            >
              <Icons.PanelLeft size={14} />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
