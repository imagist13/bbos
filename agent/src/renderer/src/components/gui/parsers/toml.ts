/**
 * 薄封装 smol-toml,把抛出的 TomlError 拍平成可序列化的结构,
 * 渲染端只关心 `{ line, column, message }`,不用关心 TomlError 类型。
 */

import { parse, TomlError } from 'smol-toml';

export interface TomlIssue {
  line: number;
  column: number;
  message: string;
}

export interface TomlValidation {
  ok: boolean;
  /** 0 个 issue 表示 OK;>0 表示语法 / 类型错误。 */
  issues: TomlIssue[];
}

export function validateToml(text: string): TomlValidation {
  try {
    parse(text);
    return { ok: true, issues: [] };
  } catch (err) {
    if (err instanceof TomlError) {
      return {
        ok: false,
        issues: [
          {
            line: err.line ?? 1,
            column: err.column ?? 1,
            message: err.message,
          },
        ],
      };
    }
    return {
      ok: false,
      issues: [
        {
          line: 1,
          column: 1,
          message: (err as Error).message ?? 'Unknown TOML error',
        },
      ],
    };
  }
}