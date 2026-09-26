/**
 * Explorer —— 工作区文件树。
 *
 * 提供 TreeView + TreeItem 递归渲染。
 */

import { useState } from "react";

import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import type { ExplorerProps, TreeItemProps } from "@/components/types";

const TreeItem = ({ item, path, level, selected, onSelect }: TreeItemProps) => {
  const [expanded, setExpanded] = useState(level < 2);
  const isDir = item.type === "dir";
  const isSelected = selected === path;

  return (
    <div>
      <div
        onClick={() => {
          if (isDir) setExpanded(!expanded);
          else onSelect(item, path);
        }}
        className={`flex cursor-pointer items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm transition ${
          isSelected
            ? "bg-emerald-500/10 text-emerald-500"
            : "text-foreground hover:bg-accent"
        }`}
        style={{ paddingLeft: `${12 + level * 16}px` }}
      >
        <span className="flex items-center text-muted-foreground">
          {isDir ? (
            expanded ? (
              <Icons.ChevronDown size={12} />
            ) : (
              <Icons.ChevronRight size={12} />
            )
          ) : null}
        </span>
        <span
          className={
            isSelected
              ? "text-emerald-500"
              : isDir
                ? "text-emerald-500"
                : "text-muted-foreground"
          }
        >
          {isDir ? <Icons.Folder size={14} /> : <Icons.File size={14} />}
        </span>
        <span className="flex-1">{item.name}</span>
        {!isDir && item.name.endsWith(".toml") && (
          <Badge variant="secondary" className="text-[10px]">
            TOML
          </Badge>
        )}
      </div>
      {isDir && expanded && item.children && (
        <div>
          {item.children.map((child, i) => (
            <TreeItem
              key={`${path}/${child.name}-${i}`}
              item={child}
              path={`${path}/${child.name}`}
              level={level + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const Explorer = ({ data, onSelect, selected }: ExplorerProps) => {
  return (
    <div className="py-2">
      {data.map((item, i) => (
        <TreeItem
          key={`${item.name}-${i}`}
          item={item}
          path={item.name}
          level={0}
          selected={selected}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
};
