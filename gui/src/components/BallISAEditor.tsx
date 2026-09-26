/**
 * BallISAEditor —— Ball 指令表 + 模糊搜索 + Ball 筛选。
 */

import { useMemo, useState } from "react";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BallInstruction } from "@/lib/mockData";
import type { Translator } from "@/components/useT";

interface BallISAEditorProps {
  data: BallInstruction[];
  t: Translator;
}

export const BallISAEditor = ({ data, t }: BallISAEditorProps) => {
  const [filter, setFilter] = useState("");
  const [selectedBall, setSelectedBall] = useState<string>("all");

  const balls = useMemo(() => [...new Set(data.map((i) => i.ball))], [data]);

  const ballCounts = useMemo(
    () =>
      balls.reduce<Record<string, number>>((acc, ball) => {
        acc[ball] = data.filter((i) => i.ball === ball).length;
        return acc;
      }, {}),
    [balls, data],
  );

  const filtered = useMemo(
    () =>
      data.filter((i) => {
        const matchFilter = i.mnemonic.toLowerCase().includes(filter.toLowerCase());
        const matchBall = selectedBall === "all" || i.ball === selectedBall;
        return matchFilter && matchBall;
      }),
    [data, filter, selectedBall],
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="mb-1 text-lg font-semibold">{t("ballIsaEditor")}</h2>
          <span className="text-xs text-muted-foreground">
            {filtered.length} {t("instructions")}
          </span>
        </div>
        <Button>
          <Icons.Plus size={13} /> {t("addInstruction")}
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
          <Icons.Search size={13} className="text-muted-foreground" />
          <input
            placeholder={t("searchInstructions")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Select value={selectedBall} onValueChange={setSelectedBall}>
          <SelectTrigger className="min-w-[150px]">
            <SelectValue placeholder={t("allBalls")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allBalls")}</SelectItem>
            {balls.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ball Stats */}
      <div className="mb-5 flex flex-wrap gap-2.5">
        {balls.map((ball) => (
          <button
            key={ball}
            onClick={() => setSelectedBall(selectedBall === ball ? "all" : ball)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              selectedBall === ball
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                : "border-border bg-card text-muted-foreground hover:bg-accent"
            }`}
          >
            <Icons.Circle size={8} />
            {ball}
            <Badge variant={selectedBall === ball ? "default" : "secondary"}>
              {ballCounts[ball]}
            </Badge>
          </button>
        ))}
      </div>

      {/* Instructions Table */}
      <Card className="flex flex-1 flex-col overflow-hidden p-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-background">
              <Th>{t("mnemonic")}</Th>
              <Th>{t("funct7")}</Th>
              <Th>{t("ballId")}</Th>
              <Th>{t("ball")}</Th>
              <Th className="w-[100px]">{t("actions")}</Th>
            </tr>
          </thead>
        </table>
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <tbody>
              {filtered.map((inst, i) => (
                <tr key={`${inst.mnemonic}-${i}`} className="border-b border-border/60">
                  <Td className="font-mono text-emerald-500">{inst.mnemonic}</Td>
                  <Td className="font-mono">{inst.funct7}</Td>
                  <Td>{inst.bid}</Td>
                  <Td>
                    <Badge variant="secondary">{inst.ball}</Badge>
                  </Td>
                  <Td>
                    <Button variant="ghost" size="sm">
                      {t("edit")}
                    </Button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th
    className={`border-b border-border px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground ${className}`}
  >
    {children}
  </th>
);

const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-2.5 text-sm ${className}`}>{children}</td>
);
