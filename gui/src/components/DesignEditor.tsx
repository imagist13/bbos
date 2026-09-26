/**
 * DesignEditor —— 设计配置 (Top + Tiles)。
 *
 * 对应 index.html 中 activeSubTab:
 * - design-layout → 显示 Top + Tiles 整页
 * - design-top    → 只显示 Top
 * - design-tiles  → 只显示 Tiles 网格
 */

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { DesignSubTab } from "@/components/types";
import type { DesignConfig, DesignTile } from "@/lib/mockData";
import type { Translator } from "@/components/useT";

interface DesignEditorProps {
  config: DesignConfig;
  activeSubTab: DesignSubTab;
  t: Translator;
}

const Divider = () => <div className="my-4 h-px bg-border" />;

export const DesignEditor = ({ config, activeSubTab, t }: DesignEditorProps) => {
  const [data, setData] = useState<DesignConfig>(config);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  const updateTile = (index: number, patch: Partial<DesignTile>) => {
    setData((d) => ({
      ...d,
      tiles: d.tiles.map((tile, i) =>
        i === index ? { ...tile, ...patch } : tile,
      ),
    }));
  };

  const showTop = activeSubTab === "design-layout" || activeSubTab === "design-top";
  const showTiles = activeSubTab === "design-layout" || activeSubTab === "design-tiles";

  return (
    <div className="h-full">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold">{t("designConfig")}</h2>
          <span className="text-xs text-muted-foreground">{t("tileCoreLayout")}</span>
        </div>
        <div className="flex items-center gap-2">
          {saved && <Badge variant="default">{t("saved")}</Badge>}
          <Button onClick={handleSave}>
            <Icons.Save size={13} /> {t("save")}
          </Button>
        </div>
      </div>

      {/* Top Config */}
      {showTop && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h3 className="mb-4 flex items-center gap-1.5 text-sm font-semibold">
              <Icons.Cpu size={14} className="text-emerald-500" />
              {t("topConfig")}
            </h3>
            <div className="flex gap-6">
              <div>
                <label className="mb-1.5 block text-xs text-muted-foreground">
                  {t("numTiles")}
                </label>
                <Input
                  type="number"
                  value={data.top.nTiles}
                  onChange={(e) =>
                    setData((d) => ({
                      ...d,
                      top: { nTiles: Number(e.target.value) },
                    }))
                  }
                  className="w-24"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tile Grid */}
      {showTiles && (
        <div className="mb-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold">
              <Icons.LayoutGrid size={14} />
              {t("tiles")}
            </h3>
            <Button variant="outline" size="sm">
              <Icons.Plus size={12} /> {t("addTile")}
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.tiles.map((tile, index) => (
              <Card key={tile.tile_id}>
                <CardContent className="pt-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
                        <Icons.Cpu size={16} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold">
                          {t("tile")} {tile.tile_id}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {t("id")}: {tile.tile_id}
                        </div>
                      </div>
                    </div>
                    <Badge variant="default">{t("active")}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Field
                      label={t("coreDataBytes")}
                      type="number"
                      value={tile.coreDataBytes}
                      onChange={(v) => updateTile(index, { coreDataBytes: v })}
                    />
                    <Field
                      label={t("xlen")}
                      type="number"
                      value={tile.xLen}
                      onChange={(v) => updateTile(index, { xLen: v })}
                    />
                    <Field
                      label={t("vaddrBits")}
                      type="number"
                      value={tile.vaddrBits}
                      onChange={(v) => updateTile(index, { vaddrBits: v })}
                    />
                    <Field
                      label={t("paddrBits")}
                      type="number"
                      value={tile.paddrBits}
                      onChange={(v) => updateTile(index, { paddrBits: v })}
                    />
                  </div>

                  <Divider />

                  <div>
                    <label className="mb-1 block text-[11px] text-muted-foreground">
                      {t("include")}
                    </label>
                    <div className="overflow-hidden text-ellipsis whitespace-nowrap rounded bg-background px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">
                      {tile.include}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface FieldProps {
  label: string;
  type: "number" | "text";
  value: number | string;
  onChange: (v: any) => void;
}

const Field = ({ label, type, value, onChange }: FieldProps) => (
  <div>
    <label className="mb-1 block text-[11px] text-muted-foreground">{label}</label>
    <Input
      type={type}
      value={value}
      onChange={(e) =>
        onChange(type === "number" ? Number(e.target.value) : e.target.value)
      }
    />
  </div>
);
