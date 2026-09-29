/**
 * WaveformViewer —— 把 VCD 文件内容画成数字波形。
 *
 * 解析交给 ./parsers/vcd,这里只负责排版 + 画 path。
 */

import { useMemo } from 'react';
import { Plus, Minus } from 'lucide-react';

import { parseVcd, type VcdValue } from '../parsers/vcd';

interface Props {
  filename: string;
  content: string;
}

const LABEL_W = 116;
const ROW_H = 28;
const PAD_X = 8;
const STEP_PX = 28;

export function WaveformViewer({ filename, content }: Props): React.JSX.Element {
  const vcd = useMemo(() => parseVcd(content), [content]);

  const cycles = vcd.cycles;
  const w = LABEL_W + cycles * STEP_PX + PAD_X;
  const h = vcd.signals.length * ROW_H + 24;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-border-default border-b bg-surface px-3 py-1.5 text-fg-tertiary text-xs">
        <div className="flex items-center gap-3">
          <span>{filename}</span>
          <span className="text-fg-disabled">|</span>
          <span>
            {cycles} cycles · {vcd.signals.length} signals
          </span>
          <span className="text-fg-disabled">|</span>
          <span className="font-mono">{vcd.timescale}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom in"
            className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Plus className="size-[12px]" />
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Minus className="size-[12px]" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-canvas">
        <svg width={w} height={h} className="block">
          {/* cycle ticks */}
          {Array.from({ length: cycles + 1 }).map((_, i) => (
            <g key={`t-${i}`}>
              <line
                x1={LABEL_W + i * STEP_PX}
                x2={LABEL_W + i * STEP_PX}
                y1={0}
                y2={h}
                stroke="hsl(var(--border-default))"
                strokeDasharray="2 3"
              />
              <text
                x={LABEL_W + i * STEP_PX + 2}
                y={12}
                fontSize={9}
                fill="hsl(var(--fg-disabled))"
                fontFamily="var(--font-mono, monospace)"
              >
                {i}
              </text>
            </g>
          ))}
          {/* signals */}
          {vcd.signals.map((sig, row) => {
            const y = row * ROW_H + 28;
            return (
              <g key={`${sig.name}-${row}`}>
                <text
                  x={LABEL_W - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="hsl(var(--fg-tertiary))"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {sig.name}
                </text>
                {sig.steps.map((v, i) => {
                  const x0 = LABEL_W + i * STEP_PX;
                  const x1 = x0 + STEP_PX;
                  const yHi = y - 6;
                  const yLo = y + 6;
                  const d = pathFor(v, x0, x1, yHi, yLo);
                  const stroke = colorFor(v);
                  return (
                    <path
                      key={i}
                      d={d}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1.2}
                    />
                  );
                })}
                <line
                  x1={LABEL_W}
                  x2={w - PAD_X}
                  y1={y + 10}
                  y2={y + 10}
                  stroke="hsl(var(--border-default))"
                />
              </g>
            );
          })}
          {vcd.signals.length === 0 && (
            <text
              x={LABEL_W + 8}
              y={28}
              fontSize={12}
              fill="hsl(var(--fg-tertiary))"
              fontFamily="var(--font-mono, monospace)"
            >
              No $var declarations found in {filename}.
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

function pathFor(
  v: VcdValue,
  x0: number,
  x1: number,
  yHi: number,
  yLo: number,
): string {
  // 1-bit 信号用方波(0 落 / 1 起);多 bit 用低线;x / z 用 mid 线 + 标注
  switch (v) {
    case 0:
      return `M ${x0} ${yHi} L ${x1} ${yHi}`;
    case 1:
      return `M ${x0} ${yLo} L ${x0} ${yHi} L ${x1} ${yHi}`;
    case 'x':
      return `M ${x0} ${(yHi + yLo) / 2} L ${x1} ${(yHi + yLo) / 2}`;
    case 'z':
      return `M ${x0} ${yHi + 2} L ${x1} ${yHi + 2} M ${x0} ${yLo - 2} L ${x1} ${yLo - 2}`;
    default:
      // numeric 多 bit:用底部粗线表示值
      return `M ${x0} ${yLo} L ${x1} ${yLo}`;
  }
}

function colorFor(v: VcdValue): string {
  // x/z 用 status-warning 色提醒一下;实数 / 0 / 1 用 fg-primary。
  if (v === 'x') return 'hsl(var(--status-warning))';
  if (v === 'z') return 'hsl(var(--fg-disabled))';
  return 'hsl(var(--fg-primary))';
}