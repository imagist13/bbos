/**
 * Simulator —— 仿真控制 + 终端输出 + 快捷命令。
 */

import { useEffect, useRef, useState } from "react";

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
import {
  BBDEV_COMMANDS,
  SIM_BINARIES,
  SIM_CHIPS,
  SIMULATION_TEMPLATES,
} from "@/lib/mockData";
import type { SimLogEntry } from "@/components/types";
import type { Translator } from "@/components/useT";

interface SimulatorProps {
  t: Translator;
}

const LOG_COLORS: Record<SimLogEntry["type"], string> = {
  info: "text-zinc-400",
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-rose-400",
};

const timestamp = () =>
  new Date().toLocaleTimeString("en-US", { hour12: false });

export const Simulator = ({ t }: SimulatorProps) => {
  const [selectedChip, setSelectedChip] = useState(SIM_CHIPS[0]);
  const [selectedSim, setSelectedSim] = useState(SIMULATION_TEMPLATES[0].id);
  const [selectedBinary, setSelectedBinary] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<SimLogEntry[]>([]);
  const [taskId, setTaskId] = useState<string | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  const runCommand = (cmd: string) => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    const id = `task-${Date.now()}`;
    setTaskId(id);

    const mockLogs: SimLogEntry[] = [
      { type: "info", text: `[${timestamp()}] Starting: ${cmd} --chip ${selectedChip}` },
      { type: "info", text: `[${timestamp()}] Resolving paths from chip.toml...` },
      { type: "info", text: `[${timestamp()}] Loading design: designs/${selectedChip}.toml` },
      { type: "success", text: `[${timestamp()}] Environment ready` },
      { type: "info", text: `[${timestamp()}] Executing: ${cmd}` },
      { type: "info", text: ">>> Running simulation..." },
      { type: "info", text: ">>> [Progress: 25%] Loading binary..." },
      { type: "info", text: ">>> [Progress: 50%] Initializing tiles..." },
      { type: "info", text: ">>> [Progress: 75%] Running test..." },
      { type: "success", text: `[${timestamp()}] Simulation completed successfully` },
      { type: "info", text: `[${timestamp()}] ${t("exitCode")}: 0` },
      { type: "info", text: `[${timestamp()}] ${t("waveformSaved")}: target/${selectedChip}/sim.vcd` },
    ];

    let i = 0;
    const interval = window.setInterval(() => {
      if (i < mockLogs.length) {
        setLogs((prev) => [...prev, mockLogs[i]]);
        i++;
      } else {
        window.clearInterval(interval);
        setIsRunning(false);
        setTaskId(null);
      }
    }, 400);
  };

  const stopSimulation = () => {
    setIsRunning(false);
    setLogs((prev) => [...prev, { type: "warning", text: t("simStopped") }]);
    setTaskId(null);
  };

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="mb-1 text-lg font-semibold">{t("simControl")}</h2>
          <span className="text-xs text-muted-foreground">
            {isRunning ? `${t("running")} ${taskId}` : t("ready")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isRunning ? "secondary" : "default"}>
            {isRunning ? t("running") : t("ready")}
          </Badge>
          {taskId && (
            <span className="font-mono text-[11px] text-muted-foreground">{taskId}</span>
          )}
        </div>
      </div>

      {/* Config Row */}
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3 p-6">
          <div className="min-w-[120px]">
            <label className="mb-1.5 block text-[11px] text-muted-foreground">
              {t("selectChip")}
            </label>
            <Select value={selectedChip} onValueChange={setSelectedChip}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIM_CHIPS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[160px]">
            <label className="mb-1.5 block text-[11px] text-muted-foreground">
              {t("selectSimulator")}
            </label>
            <Select value={selectedSim} onValueChange={setSelectedSim}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIMULATION_TEMPLATES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px] flex-1">
            <label className="mb-1.5 block text-[11px] text-muted-foreground">
              {t("selectBinary")}
            </label>
            <Select value={selectedBinary} onValueChange={setSelectedBinary}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectBinaryFirst")} />
              </SelectTrigger>
              <SelectContent>
                {SIM_BINARIES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={isRunning ? "destructive" : "default"}
            onClick={() =>
              isRunning
                ? stopSimulation()
                : runCommand(`bbdev ${selectedSim} --run`)
            }
            disabled={!selectedBinary && !isRunning}
          >
            {isRunning ? <Icons.Square size={12} /> : <Icons.Play size={12} />}
            {isRunning ? t("stop") : t("run")}
          </Button>
        </div>
      </Card>

      {/* Quick Commands */}
      <div className="mb-4">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("quickCommands")}
        </div>
        <div className="flex flex-wrap gap-2">
          {BBDEV_COMMANDS.map((cmd) => {
            const Icon = cmd.icon;
            return (
              <button
                key={cmd.id}
                onClick={() => runCommand(cmd.cmd)}
                disabled={isRunning}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:bg-accent disabled:opacity-50"
              >
                <Icon size={12} />
                {t(cmd.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Terminal */}
      <Card className="flex min-h-[200px] flex-1 flex-col overflow-hidden p-0">
        <div className="flex items-center justify-between rounded-t-lg border-b border-border bg-background px-4 py-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icons.Terminal size={13} /> {t("terminalOutput")}
          </div>
          <button
            onClick={() => setLogs([])}
            className="text-[11px] text-muted-foreground transition hover:text-foreground"
          >
            {t("clear")}
          </button>
        </div>
        <div
          ref={terminalRef}
          className="flex-1 overflow-auto rounded-b-lg bg-zinc-950 p-3 font-mono text-xs leading-relaxed"
        >
          {logs.length === 0 ? (
            <div className="whitespace-pre-line text-zinc-500">{t("readyToSimulate")}</div>
          ) : (
            logs.map((log, i) => (
              <div key={i} className={LOG_COLORS[log.type]}>
                {log.text}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
