/**
 * WaveformViewer —— 把 VCD 文件内容画成数字波形。
 *
 * 解析交给 ./parsers/vcd,这里负责排版、缩放、平移、光标、bus 数值显示。
 *
 * 交互:
 *   - 顶部 + / - / Reset:zoom 0.25x ~ 8x,reset 回到初始视图
 *   - 鼠标滚轮:Ctrl+wheel 缩放,普通 wheel 水平平移
 *   - 拖拽背景:水平 pan
 *   - 鼠标悬停:画垂直光标线 + 右侧固定数值栏显示当前 tick 各信号值
 *   - transition 标注:多 bit 信号在值变化处显示 hex 数值
 */

/* biome-ignore-all lint/suspicious/noArrayIndexKey: SVG primitives 在 tick / 信号 / step 列表中频繁重渲染,没有需要保留的状态 */

import { Hand, ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';

import { parseVcd, type VcdValue } from '../parsers/vcd';

interface Props {
  filename: string;
  content: string;
}

const LABEL_W = 132;
const VALUE_COL_W = 96;
const ROW_H = 28;
const PAD_X = 8;
const STEP_PX_BASE = 32;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;

export function WaveformViewer({ filename, content }: Props): React.JSX.Element {
  const vcd = useMemo(() => parseVcd(content), [content]);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0); // cycles offset (left)
  const [cursor, setCursor] = useState<number | null>(null);
  const [hoverRow, setHoverRow] = useState<number | null>(null);
  const [panning, setPanning] = useState(false);
  const panStart = useRef<{ pan: number; mouseX: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stepPx = STEP_PX_BASE * zoom;
  const cycles = vcd.cycles;
  const labelH = 22;

  // SVG 内容宽度 = 左标签 + 信号区 + 少量右边距(数值栏由 HTML overlay 单独渲染)
  const w = LABEL_W + cycles * stepPx + PAD_X;
  const h = labelH + vcd.signals.length * ROW_H + 8;

  const fmtValue = useCallback((v: VcdValue, width: number): string => {
    if (v === 'x') return 'x';
    if (v === 'z') return 'z';
    if (width === 1) return v === 1 ? '1' : '0';
    const hex = (v as number)
      .toString(16)
      .toUpperCase()
      .padStart(Math.max(2, Math.ceil(width / 4)), '0');
    return `0x${hex}`;
  }, []);

  const clampPan = useCallback(
    (p: number) => {
      const vc = (containerRef.current?.clientWidth ?? w) / stepPx;
      const max = Math.max(0, cycles - vc + 4);
      return Math.max(0, Math.min(p, max));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cycles, stepPx, w],
  );

  const onWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mouseX = e.clientX - rect.left;
        const tickBefore = (mouseX - LABEL_W) / stepPx + pan;
        const factor = e.deltaY < 0 ? 1.2 : 1 / 1.2;
        const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * factor));
        if (nextZoom === zoom) return;
        const stepPxNext = STEP_PX_BASE * nextZoom;
        const nextPan = tickBefore - (mouseX - LABEL_W) / stepPxNext;
        setZoom(nextZoom);
        setPan(clampPan(nextPan));
      } else {
        const dy = e.deltaX !== 0 ? e.deltaX : e.deltaY;
        setPan((p) => clampPan(p + dy / stepPx));
      }
    },
    [zoom, pan, stepPx, clampPan],
  );

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // 拖背景触发 pan
      const target = e.target as Element;
      if (target.closest('[data-no-pan]')) return;
      panStart.current = { pan, mouseX: e.clientX };
      setPanning(true);
    },
    [pan],
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;

      if (panning && panStart.current) {
        const dx = e.clientX - panStart.current.mouseX;
        setPan(clampPan(panStart.current.pan - dx / stepPx));
        return;
      }

      if (x < LABEL_W) {
        setCursor(null);
        setHoverRow(null);
        return;
      }
      const tick = Math.floor((x - LABEL_W) / stepPx + pan);
      if (tick < 0 || tick >= cycles) {
        setCursor(null);
        setHoverRow(null);
        return;
      }
      setCursor(tick);
      const y = e.clientY - rect.top;
      const row = Math.floor((y - labelH) / ROW_H);
      setHoverRow(row >= 0 && row < vcd.signals.length ? row : null);
    },
    [panning, pan, stepPx, cycles, vcd.signals.length, clampPan],
  );

  const onMouseLeave = useCallback(() => {
    setCursor(null);
    setHoverRow(null);
    setPanning(false);
    panStart.current = null;
  }, []);

  const onMouseUp = useCallback(() => {
    setPanning(false);
    panStart.current = null;
  }, []);

  const setZoomClamped = useCallback((next: number) => {
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, next)));
  }, []);

  const signalsHeader = cycles === 0 || vcd.signals.length === 0;
  const cursorX = cursor !== null ? LABEL_W + (cursor - pan) * stepPx + stepPx / 2 : null;

  return (
    <div className="flex h-full flex-col">
      {/* header bar */}
      <div className="flex flex-shrink-0 items-center justify-between border-border-default border-b bg-surface px-3 py-1.5 text-fg-tertiary text-xs">
        <div className="flex items-center gap-3">
          <span className="font-mono">{filename}</span>
          <span className="text-fg-disabled">|</span>
          <span>
            {cycles} cycles · {vcd.signals.length} signals
          </span>
          <span className="text-fg-disabled">|</span>
          <span className="font-mono">{vcd.timescale}</span>
          {cursor !== null && (
            <>
              <span className="text-fg-disabled">|</span>
              <span className="text-accent">t = {cursor}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoomClamped(zoom / 1.5)}
            className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <ZoomOut className="size-[12px]" />
          </button>
          <span className="w-10 text-center font-mono text-fg-tertiary text-[10px]">
            {zoom.toFixed(2)}x
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoomClamped(zoom * 1.5)}
            className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <ZoomIn className="size-[12px]" />
          </button>
          <button
            type="button"
            aria-label="Reset view"
            onClick={() => {
              setZoom(1);
              setPan(0);
              containerRef.current?.scrollTo({ left: 0, top: 0 });
            }}
            className="ml-2 flex h-6 items-center gap-1 rounded px-2 text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
          >
            <Hand className="size-[11px]" />
            Reset
          </button>
        </div>
      </div>

      {/* canvas:scroll 容器 + 内部 SVG */}
      <div
        ref={containerRef}
        role="application"
        aria-label={`VCD waveform viewer for ${filename}`}
        className="relative flex-1 select-none overflow-auto bg-canvas"
        style={{ cursor: panning ? 'grabbing' : 'crosshair' }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
      >
        <svg width={w} height={h} className="block">
          <title>{filename}</title>
          {/* 顶部时间轴 */}
          {Array.from({ length: cycles + 1 }, (_, i) => i).map((tick) => {
            const x = LABEL_W + (tick - pan) * stepPx;
            if (x < LABEL_W - stepPx || x > w - PAD_X) return null;
            return (
              <g key={tick}>
                <line
                  x1={x}
                  x2={x}
                  y1={0}
                  y2={h}
                  stroke="var(--border-default)"
                  strokeDasharray="2 3"
                />
                <text
                  x={x + 2}
                  y={labelH - 8}
                  fontSize={9}
                  fill="var(--fg-disabled)"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {/* 信号行 */}
          {vcd.signals.map((sig, row) => {
            const y = labelH + row * ROW_H;
            const yHi = y + 4;
            const yLo = y + ROW_H - 12;
            const yMid = (yHi + yLo) / 2;
            const isHover = hoverRow === row;
            const sigX0 = LABEL_W - pan * stepPx;
            const isOneBit = sig.width === 1;

            // 1-bit:0 → yLo,1 → yHi;x → 中线;z → 双细线(下面单独处理)
            // multi-bit:numeric → yLo;x → 中线;z → 双细线
            const yOf = (v: VcdValue): number => {
              if (v === 'x') return yMid;
              if (typeof v === 'number') {
                return isOneBit ? (v ? yHi : yLo) : yLo;
              }
              return yLo;
            };

            // 几何 segments:水平线 + transition 处垂直线
            type Seg = {
              kind: 'h' | 'v' | 'zdash';
              x0: number;
              x1: number;
              y0: number;
              y1: number;
              stroke: string;
              dash?: string;
            };
            const segs: Seg[] = [];

            for (let i = 0; i < sig.steps.length; i++) {
              const x0 = sigX0 + i * stepPx;
              const x1 = x0 + stepPx;
              if (x1 < LABEL_W || x0 > w - PAD_X) continue;
              const cur = sig.steps[i];

              // 1) transition 处的垂直边沿 —— 用主前景色,不抢值颜色的视觉
              if (i > 0 && cur !== sig.steps[i - 1]) {
                const yPrev = yOf(sig.steps[i - 1]);
                const yCur = yOf(cur);
                segs.push({
                  kind: 'v',
                  x0,
                  x1: x0,
                  y0: yPrev,
                  y1: yCur,
                  stroke: 'var(--fg-primary)',
                });
              }

              // 2) tick 内的水平线
              if (cur === 'z') {
                // z:两条细虚线,贴近 yHi / yLo 留 1px 视觉间隙
                segs.push({
                  kind: 'zdash',
                  x0,
                  x1,
                  y0: yHi + 1,
                  y1: yHi + 1,
                  stroke: 'var(--fg-disabled)',
                  dash: '2 1',
                });
                segs.push({
                  kind: 'zdash',
                  x0,
                  x1,
                  y0: yLo - 1,
                  y1: yLo - 1,
                  stroke: 'var(--fg-disabled)',
                  dash: '2 1',
                });
              } else {
                const yCur = yOf(cur);
                segs.push({
                  kind: 'h',
                  x0,
                  x1,
                  y0: yCur,
                  y1: yCur,
                  stroke: colorFor(cur),
                });
              }
            }

            // transition 数值标签的位置(只对 multi-bit)
            const transitionLabels: Array<{ tick: number; label: string }> = [];
            if (!isOneBit) {
              for (let i = 1; i < sig.steps.length; i++) {
                if (sig.steps[i] !== sig.steps[i - 1]) {
                  transitionLabels.push({
                    tick: i,
                    label: fmtValue(sig.steps[i], sig.width),
                  });
                }
              }
            }

            return (
              <g key={`${sig.name}-${row}`}>
                {/* 行底色 + 左侧 accent 边条(hover 状态) */}
                <rect
                  x={0}
                  y={y}
                  width={w}
                  height={ROW_H}
                  fill={isHover ? 'var(--bg-surface-strong)' : 'transparent'}
                />
                {isHover && (
                  <rect x={0} y={y} width={2} height={ROW_H} fill="var(--accent-default)" />
                )}
                {/* 信号名 */}
                <text
                  x={LABEL_W - 8}
                  y={y + ROW_H / 2 + 2}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight={isHover ? 600 : 400}
                  fill={isHover ? 'var(--fg-primary)' : 'var(--fg-tertiary)'}
                  fontFamily="var(--font-mono, monospace)"
                >
                  {sig.name}
                </text>
                {/* 位宽标签 */}
                <text
                  x={LABEL_W - 8}
                  y={y + ROW_H / 2 + 14}
                  textAnchor="end"
                  fontSize={9}
                  fontWeight={isHover ? 600 : 400}
                  fill={isHover ? 'var(--fg-secondary)' : 'var(--fg-disabled)'}
                  fontFamily="var(--font-mono, monospace)"
                >
                  [{sig.width}b]
                </text>
                {/* 行底线 */}
                <line
                  x1={LABEL_W}
                  x2={w - PAD_X}
                  y1={y + ROW_H - 4}
                  y2={y + ROW_H - 4}
                  stroke="var(--border-default)"
                  strokeOpacity={0.4}
                />
                {/* 波形:水平线 + 边沿 */}
                {segs.map((s, i) => (
                  <line
                    key={`s-${i}`}
                    x1={s.x0}
                    x2={s.x1}
                    y1={s.y0}
                    y2={s.y1}
                    stroke={s.stroke}
                    strokeWidth={isOneBit ? 1.4 : 1.6}
                    strokeDasharray={s.dash}
                    strokeLinecap="round"
                  />
                ))}
                {/* transition 数值标签(只对 multi-bit) */}
                {transitionLabels.map((tr, i) => {
                  const x = sigX0 + tr.tick * stepPx;
                  if (x < LABEL_W || x > w - PAD_X - 24) return null;
                  return (
                    <g key={`tr-${i}`}>
                      <rect
                        x={x + 2}
                        y={y + 2}
                        width={Math.max(tr.label.length * 5.5 + 4, 14)}
                        height={12}
                        rx={2}
                        fill="var(--accent-soft)"
                        stroke="var(--accent-default)"
                        strokeOpacity={0.4}
                      />
                      <text
                        x={x + 4}
                        y={y + 11}
                        fontSize={8}
                        fill="var(--accent-default)"
                        fontFamily="var(--font-mono, monospace)"
                      >
                        {tr.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* cursor 列高亮(半透明 accent)+ 垂直线 */}
          {cursorX !== null && (
            <>
              <rect
                x={cursorX - stepPx / 2}
                y={0}
                width={stepPx}
                height={h}
                fill="var(--accent-default)"
                fillOpacity={0.06}
                pointerEvents="none"
              />
              <line
                x1={cursorX}
                x2={cursorX}
                y1={0}
                y2={h}
                stroke="var(--accent-default)"
                strokeWidth={1}
                strokeDasharray="3 2"
                pointerEvents="none"
              />
            </>
          )}

          {signalsHeader && (
            <text
              x={LABEL_W + 8}
              y={labelH + 16}
              fontSize={12}
              fill="var(--fg-tertiary)"
              fontFamily="var(--font-mono, monospace)"
            >
              No $var declarations found in {filename}.
            </text>
          )}
        </svg>

        {/* 右侧固定数值栏(HTML overlay,不被 pan/zoom 影响,永远在视口右边) */}
        {cursor !== null && vcd.signals.length > 0 && (
          <div
            data-no-pan
            className="pointer-events-none absolute top-0 right-0 bottom-0 flex flex-col border-border-default border-l bg-surface/95 backdrop-blur-sm"
            style={{ width: VALUE_COL_W, paddingTop: labelH }}
          >
            <div className="border-border-default border-b px-2 py-1 text-[10px] text-accent">
              t = {cursor}
            </div>
            <div className="flex-1 overflow-auto">
              {vcd.signals.map((sig, row) => {
                const isHover = hoverRow === row;
                const v = sig.steps[cursor] ?? 0;
                return (
                  <div
                    key={`val-${sig.name}`}
                    className={`flex items-center justify-between px-2 text-[10px] font-mono ${
                      isHover ? 'bg-surface-strong' : ''
                    }`}
                    style={{ height: ROW_H }}
                  >
                    <span className="truncate text-fg-tertiary">{sig.name}</span>
                    <span style={{ color: colorFor(v) }}>{fmtValue(v, sig.width)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      <div className="flex flex-shrink-0 items-center gap-3 border-border-default border-t bg-surface px-3 py-1 text-fg-disabled text-[10px]">
        <span>scroll: pan</span>
        <span>·</span>
        <span>Ctrl+scroll: zoom</span>
        <span>·</span>
        <span>drag: pan</span>
        <span>·</span>
        <span>hover: inspect values</span>
      </div>
    </div>
  );
}

function colorFor(v: VcdValue): string {
  if (v === 'x') return 'var(--status-warning)';
  if (v === 'z') return 'var(--fg-disabled)';
  if (typeof v === 'number' && v > 0) return 'var(--status-success)';
  return 'var(--fg-secondary)';
}
