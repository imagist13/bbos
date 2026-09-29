/**
 * 共享类型给 EDA Workbench 组件用。
 *
 * 类型和路由输出保持一致:
 *   - FileKind / OpenFile / TreeNode 与 trpc `eda` 路由器同源
 *   - 真实内容走 trpc.edapina.readFile,不再 mock
 */

export type FileKind = 'toml' | 'canvas' | 'vcd' | 'csv';

export interface OpenFile {
  id: string;
  name: string;
  path: string;
  kind: FileKind;
  dirty?: boolean;
}

export interface TreeNode {
  name: string;
  /** Absolute path on disk. */
  path: string;
  type: 'dir' | 'file';
  kind?: FileKind;
  children?: TreeNode[];
}