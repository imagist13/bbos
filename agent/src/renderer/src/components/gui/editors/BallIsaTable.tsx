/**
 * BallIsaTable —— 简单 CSV 表格。
 *
 * 接受原始 CSV 文本(content),解析成行后渲染。第一行是表头。
 * 解析失败时退化为空表。
 */

interface Props {
  content: string;
}

interface ParsedRow {
  mnemonic: string;
  funct7: string;
  bid: string;
  ball: string;
}

function parseCsv(text: string): ParsedRow[] {
  // 简单 CSV:逗号、无引号转义。VCD/CSV 库之后再上。
  const rows = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (rows.length < 2) return [];
  // 跳过 header 行(假设第一列就叫 mnemonic)
  const dataRows = rows.slice(1);
  return dataRows.map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    return {
      mnemonic: cells[0] ?? '',
      funct7: cells[1] ?? '',
      bid: cells[2] ?? '',
      ball: cells[3] ?? '',
    };
  });
}

export function BallIsaTable({ content }: Props): React.JSX.Element {
  const rows = parseCsv(content);
  return (
    <div className="h-full overflow-auto">
      <div className="flex items-center justify-between border-border-default border-b bg-surface px-3 py-1.5 text-fg-tertiary text-xs">
        <span>ball ISA — {rows.length} rows</span>
      </div>
      {rows.length === 0 ? (
        <div className="px-3 py-6 text-center text-fg-tertiary text-xs">
          No parseable rows.
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-surface text-fg-tertiary">
            <tr className="border-border-default border-b">
              <th className="w-[60px] px-3 py-2 text-left font-medium">#</th>
              <th className="px-3 py-2 text-left font-medium">mnemonic</th>
              <th className="w-[100px] px-3 py-2 text-left font-medium">funct7</th>
              <th className="w-[80px] px-3 py-2 text-left font-medium">bid</th>
              <th className="px-3 py-2 text-left font-medium">ball</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={`${r.mnemonic}-${i}`}
                className="border-border-default border-b hover:bg-surface-strong"
              >
                <td className="px-3 py-2 text-fg-tertiary">{i}</td>
                <td className="px-3 py-2 font-mono">{r.mnemonic}</td>
                <td className="px-3 py-2 font-mono">{r.funct7}</td>
                <td className="px-3 py-2 font-mono">{r.bid}</td>
                <td className="px-3 py-2">{r.ball}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}