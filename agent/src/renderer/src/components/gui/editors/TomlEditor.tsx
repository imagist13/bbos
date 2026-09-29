/**
 * TomlEditor —— TOML / YAML 文件的 CodeMirror 编辑器。
 *
 * 复用 agent 已有的 one-dark 主题,只加最低限度的样式:
 *   - 编辑器撑满父容器
 *   - 不写自定义颜色,跟随 one-dark 默认配色
 */

import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { yaml as yamlLang } from '@codemirror/lang-yaml';
import { toml as tomlLegacy } from '@codemirror/legacy-modes/mode/toml';
import { EditorView } from '@codemirror/view';
import { oneDark } from '@codemirror/theme-one-dark';

const tomlLangExt = StreamLanguage.define(tomlLegacy);

const sharedTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '12.5px' },
  '.cm-scroller': { fontFamily: 'var(--font-mono, monospace)' },
  '.cm-gutters': { backgroundColor: 'transparent', borderRight: 'none' },
});

export function TomlEditor({ value, readOnly = false }: { value: string; readOnly?: boolean }): React.JSX.Element {
  return (
    <CodeMirror
      value={value}
      theme={oneDark}
      extensions={[tomlLangExt, sharedTheme]}
      editable={!readOnly}
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

export function YamlEditor({ value, readOnly = false }: { value: string; readOnly?: boolean }): React.JSX.Element {
  return (
    <CodeMirror
      value={value}
      theme={oneDark}
      extensions={[yamlLang(), sharedTheme]}
      editable={!readOnly}
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
