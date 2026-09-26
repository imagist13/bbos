/**
 * LeftDrawerNav —— 左侧 220px 抽屉导航。
 *
 * 4 个分组(chip / design / ball / sim),点击切换主分区与默认子 tab。
 */

import { useEffect, useState } from "react";

import { Icons } from "@/components/icons";
import { DRAWER_GROUPS } from "@/components/constants";
import type { HomeSubTab, HomeTab } from "@/components/types";
import type { Translator } from "@/components/useT";

interface LeftDrawerNavProps {
  activeTab: HomeTab;
  activeSubTab: HomeSubTab;
  onTabChange: (tab: HomeTab) => void;
  onSubTabChange: (sub: HomeSubTab) => void;
  t: Translator;
}

const ICON_BY_KEY: Record<string, React.ReactNode> = {
  settings: <Icons.Settings size={14} />,
  layout: <Icons.LayoutGrid size={14} />,
  zap: <Icons.Zap size={14} />,
  terminal: <Icons.Terminal size={14} />,
};

const ITEM_ICON: Record<string, React.ReactNode> = {
  chipFile: <Icons.File size={12} />,
  designInclude: <Icons.Folder size={12} />,
  simulationTargets: <Icons.Terminal size={12} />,
  uvmConfig: <Icons.Check size={12} />,
  tileCoreLayout: <Icons.LayoutGrid size={12} />,
  topConfig: <Icons.Settings size={12} />,
  tiles: <Icons.Cpu size={12} />,
  instructions: <Icons.Zap size={12} />,
  allBalls: <Icons.Circle size={12} />,
  simControl: <Icons.Play size={12} />,
  terminalOutput: <Icons.Terminal size={12} />,
  quickCommands: <Icons.Cpu size={12} />,
};

export const LeftDrawerNav = ({
  activeTab,
  activeSubTab,
  onTabChange,
  onSubTabChange,
  t,
}: LeftDrawerNavProps) => {
  const [expandedGroup, setExpandedGroup] = useState<HomeTab>(activeTab);

  // 主分区切换时自动展开对应 group
  useEffect(() => {
    setExpandedGroup(activeTab);
  }, [activeTab]);

  const toggleGroup = (groupId: HomeTab) =>
    setExpandedGroup((cur) => (cur === groupId ? (cur as HomeTab) : groupId));

  return (
    <aside className="flex w-[220px] flex-shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      {/* Header */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {t("config")}
        </div>
      </div>

      {/* Drawer Groups */}
      <div className="flex-1 overflow-auto p-2">
        {DRAWER_GROUPS.map((group) => {
          const isExpanded = expandedGroup === group.id;
          const isGroupActive = activeTab === group.id;

          return (
            <div key={group.id} className="mb-1">
              <button
                onClick={() => {
                  toggleGroup(group.id);
                  onTabChange(group.id);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition ${
                  isGroupActive
                    ? "bg-emerald-500/10 text-emerald-500"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {ICON_BY_KEY[group.icon]}
                <span className="flex-1">{t(group.labelKey)}</span>
                <span className="flex items-center text-muted-foreground">
                  {isExpanded ? <Icons.ChevronDown size={12} /> : <Icons.ChevronRight size={12} />}
                </span>
              </button>

              <div
                className={`overflow-hidden pl-3 transition-all duration-200 ${
                  isExpanded ? "mt-1 max-h-[400px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {group.items.map((item) => {
                  const isItemActive = activeSubTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onSubTabChange(item.id)}
                      className={`mb-0.5 flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-left text-[11px] transition ${
                        isItemActive
                          ? "bg-emerald-500/10 font-medium text-emerald-500"
                          : "text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {ITEM_ICON[item.labelKey]}
                      <span>{t(item.labelKey)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
