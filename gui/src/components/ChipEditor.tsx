/**
 * ChipEditor —— chip.toml 配置编辑。
 *
 * 对应 index.html 中 activeSubTab:
 * - chip-config         → designInclude 卡片(默认)
 * - chip-design-include → designInclude 卡片
 * - chip-sim-targets    → simulationTargets 卡片
 * - chip-uvm            → uvmConfig 卡片
 */

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ChipSubTab } from "@/components/types";
import type { ChipConfig } from "@/lib/mockData";
import type { Translator } from "@/components/useT";

interface ChipEditorProps {
  config: ChipConfig;
  activeSubTab: ChipSubTab;
  t: Translator;
}

const SUB_TAB_TO_SECTION: Record<ChipSubTab, "designs" | "sims" | "uvm"> = {
  "chip-config": "designs",
  "chip-design-include": "designs",
  "chip-sim-targets": "sims",
  "chip-uvm": "uvm",
};

export const ChipEditor = ({ config, activeSubTab, t }: ChipEditorProps) => {
  const [data, setData] = useState<ChipConfig>(config);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const section = SUB_TAB_TO_SECTION[activeSubTab] ?? "designs";

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold">{t("chipFile")}</h2>
          <span className="text-xs text-muted-foreground">{t("chipConfig")}</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="default">{t("saved")}</Badge>}
          <Button onClick={handleSave}>
            <Icons.Save size={13} /> {t("save")}
          </Button>
        </div>
      </div>

      {/* Section: designs (chip-design-include) */}
      {section === "designs" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Icons.LayoutGrid size={14} className="text-emerald-500" />
              {t("designInclude")}
            </CardTitle>
          </CardHeader>
          <CardContent className="max-w-md space-y-2">
            <label className="block text-xs text-muted-foreground">
              {t("designFilePath")}
            </label>
            <Input
              value={data.designs.include}
              onChange={(e) =>
                setData((d) => ({
                  ...d,
                  designs: { ...d.designs, include: e.target.value },
                }))
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Section: sims */}
      {section === "sims" && (
        <div className="flex flex-col gap-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                <Icons.Terminal size={14} className="text-emerald-500" />
                {t("simulationTargets")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(data.sims).map(([key, value]) => (
                <div key={key}>
                  <label className="mb-1.5 block text-xs capitalize text-muted-foreground">
                    {key}
                  </label>
                  <Input
                    value={value}
                    onChange={(e) =>
                      setData((d) => ({
                        ...d,
                        sims: { ...d.sims, [key]: e.target.value },
                      }))
                    }
                    className="font-mono text-xs"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Section: uvm */}
      {section === "uvm" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Icons.Check size={14} className="text-emerald-500" />
              {t("uvmConfig")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("balls")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.uvm.balls.map((ball) => (
                    <Badge key={ball} variant="secondary">
                      {ball}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("ips")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {data.uvm.ips.map((ip) => (
                    <Badge key={ip}>{ip}</Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
