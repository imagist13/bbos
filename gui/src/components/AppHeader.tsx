/**
 * AppHeader —— 顶部 48px 头部。
 *
 * 含:品牌色块 + appName + WebPreview 徽章 + 语言切换 + 设置按钮。
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/icons";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import type { Translator } from "@/components/useT";

interface AppHeaderProps {
  lang: Lang;
  onLangChange: (lang: Lang) => void;
  t: Translator;
}

export const AppHeader = ({ lang, onLangChange, t }: AppHeaderProps) => {
  const next = lang === "zh" ? "en" : "zh";
  const nextLabel = LANGUAGES.find((l) => l.id === next)?.native ?? next;

  return (
    <header className="z-50 flex h-12 flex-shrink-0 items-center justify-between border-b border-border bg-secondary px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-sm font-bold text-white">
          B
        </div>
        <span className="text-sm font-semibold text-foreground">{t("appName")}</span>
        <Badge variant="secondary">{t("webPreview")}</Badge>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onLangChange(next)}
          className="flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-accent"
        >
          <Icons.Globe size={13} />
          {nextLabel}
        </button>
        <Button variant="ghost" size="sm" aria-label={t("settings")}>
          <Icons.Settings size={13} />
        </Button>
      </div>
    </header>
  );
};
