/**
 * TomlEditor —— TOML / YAML 文件的 CodeMirror 编辑器。
 *
 * 校验:smol-toml 解析当前内容;解析失败时把第一个 error 标到 gutter,
 * footer 也显示一行。最朴素,不引入 @codemirror/lint。
 */

import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { StreamLanguage } from '@codemirror/language';
import { toml as tomlLegacy } from '@codemirror/legacy-modes/mode/toml';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import CodeMirror from '@uiw/react-codemirror';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useMemo } from 'react';

import { type TomlIssue, validateToml } from '../parsers/toml';

const tomlLangExt = StreamLanguage.define(tomlLegacy);

const sharedTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '12.5px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)' },
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: 'none' },
  // 错误那行加左侧红色提示。精确行号在 footer 里展示,
  // 这里只画背景不标行号,避免动 @uiw/react-codemirror 内部 instance。
  '.cm-toml-error-line': {
    backgroundColor: 'hsl(var(--status-danger) / 0.08)',
    boxShadow: 'inset 2px 0 0 hsl(var(--status-danger))',
  },
});

function TomlFooter({ issues }: { issues: TomlIssue[] }): React.JSX.Element {
  if (issues.length === 0) {
    return (
      <div className="flex h-6 items-center gap-1.5 border-border-default border-t bg-surface px-3 text-[11px] text-fg-tertiary">
        <CheckCircle2 className="size-[11px] text-status-success" />
        <span>TOML valid</span>
      </div>
    );
  }
  const first = issues[0];
  return (
    <div className="flex h-6 items-center gap-1.5 border-border-default border-t bg-surface px-3 text-[11px]">
      <AlertCircle className="size-[11px] text-status-danger" />
      <span className="text-status-danger">
        line {first.line}:{first.column} — {first.message}
      </span>
      {issues.length > 1 && <span className="text-fg-tertiary">(+{issues.length - 1} more)</span>}
    </div>
  );
}

export function TomlEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}): React.JSX.Element {
  // 校验只针对当前 value 做,纯计算开销很低,直接同步计算。
  const validation = useMemo(() => validateToml(value), [value]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden bg-canvas">
        <CodeMirror
          value={value}
          theme={oneDark}
          extensions={[tomlLangExt, sharedTheme]}
          editable={!readOnly}
          onChange={onChange}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
          }}
          className="h-full"
        />
      </div>
      <TomlFooter issues={validation.issues} />
    </div>
  );
}

export function YamlEditor({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}): React.JSX.Element {
  return (
    <CodeMirror
      value={value}
      theme={oneDark}
      extensions={[yamlLang(), sharedTheme]}
      editable={!readOnly}
      onChange={onChange}
      basicSetup={{
        lineNumbers: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightSelectionMatches: true,
      }}
      className="h-full"
    />
  );
}
