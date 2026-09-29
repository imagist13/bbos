/**
 * SchematicEditor —— 基于 reactflow 的原理图编辑器。
 *
 * 节点 / 边都来自 mockData 里的 toy 拓扑:
 *   host → gemmini / relu / trace → mxfp2int → axi → host
 *
 * 节点类型目前只有一种 `ballNode`;后续如果需要 host / ip 区分,
 * 在这里再加 case。配色全部用 agent 的 design tokens。
 */

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

type NodeKind = 'host' | 'ball' | 'ip';

interface BallNodeData {
  label: string;
  sub: string;
  kind: NodeKind;
}

function ballNodeClass(kind: NodeKind, selected: boolean): string {
  const border =
    kind === 'host'
      ? 'border-accent/70'
      : kind === 'ip'
        ? 'border-border-strong'
        : 'border-border-default';
  return [
    'min-w-[140px] rounded-md border bg-surface text-fg-primary shadow-sm',
    border,
    selected ? 'ring-2 ring-accent' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

function BallNode({ data, selected }: NodeProps<BallNodeData>): React.JSX.Element {
  return (
    <div className={ballNodeClass(data.kind, !!selected)}>
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !bg-fg-tertiary !border-0"
      />
      <div className="px-3 py-1.5 font-semibold text-xs">{data.label}</div>
      <div className="border-border-default border-t px-3 py-1 text-fg-tertiary text-[10px]">
        {data.sub}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !bg-fg-tertiary !border-0"
      />
    </div>
  );
}

const NODE_TYPES = { ballNode: BallNode };

const NODES: Node<BallNodeData>[] = [
  {
    id: 'host',
    type: 'ballNode',
    position: { x: 60, y: 160 },
    data: { label: 'host', sub: 'BuckyballHost', kind: 'host' },
  },
  {
    id: 'ball-gemmini',
    type: 'ballNode',
    position: { x: 280, y: 60 },
    data: { label: 'gemmini', sub: 'GemminiBall', kind: 'ball' },
  },
  {
    id: 'ball-relu',
    type: 'ballNode',
    position: { x: 280, y: 180 },
    data: { label: 'relu', sub: 'ReluBall', kind: 'ball' },
  },
  {
    id: 'ball-trace',
    type: 'ballNode',
    position: { x: 280, y: 300 },
    data: { label: 'trace', sub: 'TraceBall', kind: 'ball' },
  },
  {
    id: 'ball-mxfp',
    type: 'ballNode',
    position: { x: 520, y: 120 },
    data: { label: 'mxfp2int', sub: 'Mxfp2IntBall', kind: 'ball' },
  },
  {
    id: 'axi',
    type: 'ballNode',
    position: { x: 520, y: 280 },
    data: { label: 'axi', sub: 'AXI Bus', kind: 'ip' },
  },
];

const EDGES: Edge[] = [
  { id: 'e1', source: 'host', target: 'ball-gemmini', label: 'exec' },
  { id: 'e2', source: 'host', target: 'ball-relu', label: 'exec' },
  { id: 'e3', source: 'host', target: 'ball-trace', label: 'exec' },
  { id: 'e4', source: 'ball-gemmini', target: 'ball-mxfp', label: 'dout' },
  { id: 'e5', source: 'ball-relu', target: 'ball-mxfp', label: 'dout' },
  { id: 'e6', source: 'ball-mxfp', target: 'axi', label: 'mem' },
  { id: 'e7', source: 'axi', target: 'host', label: 'irq' },
];

export function SchematicEditor(): React.JSX.Element {
  return (
    <div className="h-full">
      <ReactFlow
        nodes={NODES}
        edges={EDGES}
        nodeTypes={NODE_TYPES}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} />
        <Controls position="bottom-left" />
        <MiniMap pannable zoomable position="bottom-right" />
      </ReactFlow>
    </div>
  );
}
