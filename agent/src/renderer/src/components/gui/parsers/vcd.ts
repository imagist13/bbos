/**
 * 最小可用的 VCD (Value Change Dump) 解析器。
 *
 * 支持的语法子集:
 *   - $timescale
 *   - $scope / $upscope / $enddefinitions / $dumpvars / $dumpall / $dumpon / $dumpoff
 *   - $var <type> <width> <id> <name...> $end
 *   - 时间步: #<num>
 *   - 标量赋值: 0!  1#  x!  z!
 *   - 向量赋值: b<bits> <id>
 *
 * 输出:
 *   - timescale + signals:每个信号一个 steps 数组,长度 = cycles,
 *     每个 entry 是该 tick 的值(0/1 或 'x'/'z' 或数字)。
 *
 * 不在本期之内:压缩值(全 X/全 Z 的向量简写)、字符串变量、real。
 */

export type VcdValue = number | 'x' | 'z';

export interface VcdSignal {
  /** 原文中声明的名字,可以包含 `\` 转义 + 空格。 */
  name: string;
  width: number;
  /** 每个 tick 一个值;cycles === steps.length。 */
  steps: VcdValue[];
}

export interface VcdData {
  timescale: string;
  signals: VcdSignal[];
  /** 时间步总数,等于最大 tick + 1。 */
  cycles: number;
}

/** 解析一个赋值 token,例如 `0!` / `1#` / `b0010 b` / `x!` / `z!`。 */
function parseValueToken(tok: string): { value: VcdValue; id: string } | null {
  // b<bits> <id> 形式:bits 是 0/1/x/z 串
  if (tok.startsWith('b')) {
    const m = tok.match(/^b([01xzXZ]+)(\S+)$/);
    if (!m) return null;
    // 向量值压成一个数字(把 x/z 当 0),只取 8 位足够做示意。
    const trimmed = m[1].replace(/[xzXZ]/g, '0');
    const n = parseInt(trimmed, 2);
    return { value: Number.isFinite(n) ? n : 0, id: m[2] };
  }
  if (tok.length < 2) return null;
  const v = tok[0];
  const id = tok.slice(1);
  if (v === '0' || v === '1') return { value: Number(v), id };
  if (v === 'x' || v === 'X') return { value: 'x', id };
  if (v === 'z' || v === 'Z') return { value: 'z', id };
  return null;
}

export function parseVcd(text: string): VcdData {
  // 用行处理,主要是为了 `$var ... $end` 内部能拿到完整名字。
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);

  const SIGNAL_VALUE_TOKENS = new Set(['0', '1', 'x', 'X', 'z', 'Z', 'b']);

  // signal id → metadata
  const sigs = new Map<string, { name: string; width: number }>();
  let timescale = '1ns';
  // events: tick → sigId → value
  const events = new Map<number, Map<string, VcdValue>>();

  let i = 0;
  let currentTick = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line === '$timescale') {
      // $timescale 1ns $end
      timescale = lines[i + 1] ?? timescale;
      i += 2;
      while (i < lines.length && lines[i] !== '$end') i++;
      i++;
    } else if (line === '$var') {
      // $var <type> <width> <id> <name...> $end
      const parts = lines[i + 1]?.split(/\s+/) ?? [];
      const width = Number.parseInt(parts[1] ?? '1', 10);
      const id = parts[2] ?? '';
      // 名字是同一行 $end 之前的内容(可能含空格)
      const endIdx = parts.indexOf('$end');
      const name =
        endIdx >= 0 ? parts.slice(3, endIdx).join(' ') : (parts[3] ?? id);
      sigs.set(id, { name, width: Number.isFinite(width) ? width : 1 });
      i += 2;
    } else if (line === '$dumpvars' || line === '$dumpall') {
      i++;
      while (i < lines.length && lines[i] !== '$end') {
        const ev = parseValueToken(lines[i]);
        if (ev) {
          if (!events.has(0)) events.set(0, new Map());
          events.get(0)!.set(ev.id, ev.value);
        }
        i++;
      }
      i++;
    } else if (
      line === '$scope' ||
      line === '$upscope' ||
      line === '$enddefinitions' ||
      line === '$comment' ||
      line === '$dumpon' ||
      line === '$dumpoff'
    ) {
      while (i < lines.length && lines[i] !== '$end') i++;
      i++;
    } else if (line.startsWith('#')) {
      currentTick = Number.parseInt(line.slice(1), 10);
      if (!Number.isFinite(currentTick) || currentTick < 0) currentTick = 0;
      i++;
    } else if (SIGNAL_VALUE_TOKENS.has(line[0])) {
      const ev = parseValueToken(line);
      if (ev) {
        if (!events.has(currentTick)) events.set(currentTick, new Map());
        events.get(currentTick)!.set(ev.id, ev.value);
      }
      i++;
    } else {
      // 未知行,跳过
      i++;
    }
  }

  const ticks = [...events.keys()].sort((a, b) => a - b);
  const cycles = ticks.length === 0 ? 0 : Math.max(...ticks) + 1;

  const signals: VcdSignal[] = [];
  for (const [id, meta] of sigs) {
    const steps: VcdValue[] = new Array(cycles).fill(0);
    let cur: VcdValue = 0;
    for (let t = 0; t < cycles; t++) {
      const ev = events.get(t)?.get(id);
      if (ev !== undefined) cur = ev;
      steps[t] = cur;
    }
    signals.push({ name: meta.name, width: meta.width, steps });
  }

  // 把 cycles = 0 的情况兜底成至少一格,UI 不至于崩。
  return { timescale, signals, cycles: Math.max(cycles, 1) };
}