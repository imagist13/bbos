/**
 * SchematicEditor —— 基于 reactflow 的原理图编辑器。
 *
 * 交互:
 *   - 节点可拖拽改变位置
 *   - 从一个节点的 source Handle 拖到另一个节点的 target Handle 创建新边
 *   - 选中边后按 Delete(或点边上的 × 按钮)删除
 *   - 顶部 "Reset" 按钮恢复初始拓扑
 *
 * 配色全部使用 agent 的 design tokens。
 */

import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
  type NodeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { RotateCcw, X } from 'lucide-react';

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

const INITIAL_NODES: Node<BallNodeData>[] = [
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

const INITIAL_EDGES: Edge[] = [
  { id: 'e1', source: 'host', target: 'ball-gemmini', label: 'exec' },
  { id: 'e2', source: 'host', target: 'ball-relu', label: 'exec' },
  { id: 'e3', source: 'host', target: 'ball-trace', label: 'exec' },
  { id: 'e4', source: 'ball-gemmini', target: 'ball-mxfp', label: 'dout' },
  { id: 'e5', source: 'ball-relu', target: 'ball-mxfp', label: 'dout' },
  { id: 'e6', source: 'ball-mxfp', target: 'axi', label: 'mem' },
  { id: 'e7', source: 'axi', target: 'host', label: 'irq' },
];

export function SchematicEditor(): React.JSX.Element {
  const [nodes, , onNodesChange] = useNodesState<BallNodeData>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (conn: Connection) =>
      setEdges((eds) =>
        addEdge({ ...conn, id: `e${Date.now()}`, label: 'link' }, eds),
      ),
    [setEdges],
  );

  const resetAll = useCallback(() => {
    setEdges(INITIAL_EDGES);
    setSelectedEdgeId(null);
    // useNodesState 没暴露 setNodes,这里通过 onNodesChange 给每个节点
    // 派一个 'position' change 把坐标写回,reactflow 内部会刷新位置。
    const changes: NodeChange[] = INITIAL_NODES.map((n) => ({
      id: n.id,
      type: 'position',
      position: n.position,
    }));
    onNodesChange(changes);
  }, [setEdges, onNodesChange]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-9 flex-shrink-0 items-center justify-between border-border-default border-b bg-surface px-3 text-fg-tertiary text-xs">
        <div className="flex items-center gap-3">
          <span>toy.canvas</span>
          <span className="text-fg-disabled">|</span>
          <span>
            {nodes.length} nodes · {edges.length} edges
          </span>
          {selectedEdgeId && (
            <>
              <span className="text-fg-disabled">|</span>
              <span className="text-accent">edge {selectedEdgeId} selected</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetAll}
            className="flex h-6 items-center gap-1 rounded px-2 text-fg-secondary hover:bg-surface-strong hover:text-fg-primary"
          >
            <RotateCcw className="size-[11px]" />
            Reset
          </button>
          {selectedEdgeId && (
            <button
              type="button"
              onClick={() => {
                setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId));
                setSelectedEdgeId(null);
              }}
              className="flex h-6 items-center gap-1 rounded bg-status-danger/10 px-2 text-status-danger hover:bg-status-danger/20"
            >
              <X className="size-[11px]" />
              Delete edge
            </button>
          )}
        </div>
      </div>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(_, e) => setSelectedEdgeId(e.id)}
          onPaneClick={() => setSelectedEdgeId(null)}
          fitView
          nodesDraggable
          nodesConnectable
          elementsSelectable
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={16} />
          <Controls position="bottom-left" />
          <MiniMap pannable zoomable position="bottom-right" />
        </ReactFlow>
      </div>
    </div>
  );
}