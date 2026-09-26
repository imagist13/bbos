/**
 * Home 页面专用 i18n hook。
 *
 * 与全局 i18n 的关系:
 * - 全局 `src/lib/i18n.ts` 持有文案字典
 * - 此 hook 提供有类型的 translator,并向上层组件注入 lang 状态
 */

import { useMemo } from "react";
import { translations, type Lang, type TranslationKey } from "@/lib/i18n";

export type Translator = (
  key: TranslationKey,
  vars?: Record<string, string | number>,
) => string;

/** 创建一个绑定到某个 lang 的 translator。 */
export const useT = (lang: Lang): Translator => {
  return useMemo<Translator>(() => {
    const dict = translations[lang];
    return (key, vars) => {
      const raw: string = dict[key] ?? key;
      if (!vars) return raw;
      return Object.entries(vars).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)),
        raw,
      );
    };
  }, [lang]);
};
