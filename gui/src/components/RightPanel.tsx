/**
 * RightPanel —— 右侧 280px 双 tab 面板:Explorer / Agent。
 *
 * 提供给 Home.tsx 调用,通过 onCollapse 收缩整个面板。
 */

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Explorer } from "@/components/Explorer";
import { AgentPanel } from "@/components/AgentPanel";
import { MOCK_PROJECT } from "@/lib/mockData";
import type { HomeTab, RightSection } from "@/components/types";
import type { Translator } from "@/components/useT";

interface RightPanelProps {
  activeTab: HomeTab;
  t: Translator;
  onCollapse: () => void;
}

export const RightPanel = ({ activeTab, t, onCollapse }: RightPanelProps) => {
  const [activeSection, setActiveSection] = useState<RightSection>("explorer");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  return (
    <aside className="flex w-[280px] flex-shrink-0 flex-col border-l border-border bg-sidebar">
      {/* Section Tabs */}
      <div className="flex border-b border-border">
        <div className="flex flex-1">
          <button
            onClick={() => setActiveSection("explorer")}
            className={`flex-1 px-2.5 py-2.5 text-[11px] font-medium transition ${
              activeSection === "explorer"
                ? "border-b-2 border-emerald-500 bg-background text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("workspace")}
          </button>
          <button
            onClick={() => setActiveSection("agent")}
            className={`flex-1 px-2.5 py-2.5 text-[11px] font-medium transition ${
              activeSection === "agent"
                ? "border-b-2 border-emerald-500 bg-background text-emerald-500"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icons.Sparkles size={11} className="mr-1 inline-block" />
            {t("agentAssistant")}
          </button>
        </div>
        <button
          onClick={onCollapse}
          aria-label="Collapse panel"
          className="flex items-center justify-center border-l border-border px-2.5 py-2.5 text-muted-foreground transition hover:bg-accent"
        >
          <Icons.PanelLeft size={12} />
        </button>
      </div>

      {/* Explorer Section */}
      {activeSection === "explorer" && (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="border-b border-border p-2">
            <div className="flex items-center gap-1.5 rounded-sm border border-border bg-background px-2 py-1.5">
              <Icons.Search size={12} className="text-muted-foreground" />
              <input
                placeholder={t("searchFiles")}
                className="flex-1 border-none bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            <Explorer
              data={[MOCK_PROJECT.structure[0]]}
              onSelect={(_, path) => setSelectedFile(path)}
              selected={selectedFile}
            />
          </div>
          <div className="flex gap-1.5 border-t border-border p-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Icons.Plus size={11} /> {t("new")}
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              {t("import")}
            </Button>
          </div>
        </div>
      )}

      {/* Agent Section */}
      {activeSection === "agent" && <AgentPanel activeTab={activeTab} t={t} />}
    </aside>
  );
};
