/**
 * EDARightPanel —— 右侧 Workspace / Agent 切换面板。
 *
 * Workspace 列出当前 design 的关键参数(从 toy.toml mock 出来);
 * Agent 提供一个最小可聊的输入框,真实接入 LLM 之前不接 IPC。
 */

import { useState } from 'react';
import { Bot, Send, User, PanelLeftClose } from 'lucide-react';

interface AgentMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const INITIAL_AGENT_MSGS: AgentMsg[] = [
  {
    id: 0,
    role: 'assistant',
    content: 'I can edit the active TOML file, draw your schematic, or explain the waveform. What do you need?',
  },
];

const WORKSPACE_ROWS: { k: string; v: string }[] = [
  { k: 'nTiles', v: '1' },
  { k: 'coreDataBytes', v: '64' },
  { k: 'xLen', v: '64' },
  { k: 'vaddrBits', v: '39' },
  { k: 'paddrBits', v: '56' },
  { k: 'balls', v: 'gemmini' },
  { k: 'ips', v: 'axis' },
];

interface Props {
  collapsed: boolean;
  onCollapse: () => void;
}

export function EDARightPanel({ collapsed, onCollapse }: Props): React.JSX.Element {
  const [tab, setTab] = useState<'workspace' | 'agent'>('agent');
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AgentMsg[]>(INITIAL_AGENT_MSGS);

  const send = (): void => {
    if (!prompt.trim()) return;
    setMessages((prev) => [...prev, { id: prev.length, role: 'user', content: prompt }]);
    setPrompt('');
  };

  if (collapsed) return <div className="w-0" />;

  return (
    <aside className="flex w-[300px] flex-shrink-0 flex-col border-border-default border-l bg-surface">
      <div className="flex h-9 items-center gap-1 border-border-default border-b px-2">
        {(['workspace', 'agent'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={[
              'rounded px-2 py-0.5 text-xs',
              tab === t
                ? 'bg-elevated text-fg-primary'
                : 'text-fg-tertiary hover:bg-surface-strong',
            ].join(' ')}
          >
            {t === 'workspace' ? 'Workspace' : 'Agent'}
          </button>
        ))}
        <div className="ml-auto" />
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse panel"
          className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
        >
          <PanelLeftClose className="size-[12px]" />
        </button>
      </div>

      {tab === 'workspace' ? (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2 text-xs">
            {WORKSPACE_ROWS.map((r) => (
              <div
                key={r.k}
                className="flex items-center justify-between rounded-md border border-border-default bg-canvas px-2 py-1.5"
              >
                <span className="text-fg-tertiary">{r.k}</span>
                <span className="font-mono text-fg-primary">{r.v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3">
            <div className="space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={[
                    'rounded-md border px-3 py-2 text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'border-accent/40 bg-accent/5'
                      : 'border-border-default bg-canvas',
                  ].join(' ')}
                >
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-[10px] text-fg-tertiary uppercase tracking-wide">
                    {m.role === 'user' ? (
                      <User className="size-[10px]" />
                    ) : (
                      <Bot className="size-[10px]" />
                    )}
                    {m.role === 'user' ? 'You' : 'Assistant'}
                  </div>
                  <div className="text-fg-primary">{m.content}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="border-border-default border-t p-2">
            <div className="flex items-end gap-1.5 rounded-md border border-border-default bg-canvas p-2">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                placeholder="Ask the agent…"
                className="flex-1 resize-none bg-transparent text-fg-primary text-xs outline-none placeholder:text-fg-tertiary"
              />
              <button
                type="button"
                onClick={send}
                aria-label="Send"
                className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-fg-on-accent hover:bg-accent-hover"
              >
                <Send className="size-[12px]" />
              </button>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
