/**
 * WaveformViewer —— VCD 文件的简易可视化。
 *
 * 真正解析 VCD 不在本期之内。这里展示文件名 + 原始文本 fallback,等
 * 接 VCD parser 时直接换成它的输出。
 */

interface Props {
  filename: string;
  content: string;
}

const WAVE_HEIGHT = 200;

export function WaveformViewer({ filename, content }: Props): React.JSX.Element {
  // VCD parser 暂时没接 — 退化为原文 fallback,UI 还是先能看到。
  const previewLines = content.split('\n').slice(0, 12);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-border-default border-b bg-surface px-3 py-2 text-fg-tertiary text-xs">
        <div className="flex items-center gap-3">
          <span>{filename}</span>
          <span className="text-fg-disabled">|</span>
          <span>waveform (preview)</span>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-canvas">
        <svg viewBox={`0 0 ${WAVE_HEIGHT * 2} ${WAVE_HEIGHT}`} className="block w-full">
          <text
            x={50}
            y={30}
            textAnchor="middle"
            fontSize={12}
            fill="hsl(var(--fg-tertiary))"
          >
            VCD parser not implemented yet
          </text>
          <text
            x={50}
            y={50}
            textAnchor="middle"
            fontSize={10}
            fill="hsl(var(--fg-disabled))"
          >
            showing raw text below
          </text>
        </svg>
        <pre className="px-3 py-2 font-mono text-fg-secondary text-[11px] leading-relaxed">
          {previewLines.join('\n')}
          {content.split('\n').length > 12 ? '\n…' : ''}
        </pre>
      </div>
    </div>
  );
}