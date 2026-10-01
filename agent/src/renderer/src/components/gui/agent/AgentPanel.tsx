/**
 * AgentPanel —— 5 个 tab 页右侧的 Agent 面板。
 *
 * v0.4 只做 UI 壳,模型选择 + 输入框 + 状态条;
 * 真接 LLM/工具调用等 v0.5,目前 send() 只往本地 messages 追加一条。
 *
 * 布局(从上到下):
 *   ┌─────────────────────────────┐
 *   │ model selector (dropdown)   │  ← 切 Claude Sonnet 5 High / 4.5 / Opus ...
 *   ├─────────────────────────────┤
 *   │                             │
 *   │   messages (scroll)         │  ← 历史消息;空状态显示 hint
 *   │                             │
 *   ├─────────────────────────────┤
 *   │ ┌─────────────────────────┐ │
 *   │ │ textarea                │ │
 *   │ │ 📎  🎙              ➤  │ │
 *   │ └─────────────────────────┘ │
 *   ├─────────────────────────────┤
 *   │ [Go Live] [激活]            │
 *   │ Agent State: 16/400 (40%)   │
 *   │ ▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░  │
 *   │ 66,406fa   42.70%           │
 *   └─────────────────────────────┘
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  ChevronDown,
  Cpu,
  Mic,
  Paperclip,
  Power,
  Radio,
  Send,
  User,
} from 'lucide-react';

interface AgentMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

type ModelId = 'sonnet-5-high' | 'sonnet-4.5' | 'opus-4' | 'haiku-4';
const MODEL_IDS: ReadonlyArray<ModelId> = ['sonnet-5-high', 'sonnet-4.5', 'opus-4', 'haiku-4'];

export function AgentPanel(): React.JSX.Element {
  const { t } = useTranslation();
  const [model, setModel] = useState<ModelId>(MODEL_IDS[0]);
  const [modelOpen, setModelOpen] = useState(false);
  const [input, setInput] = useState('');
  // intro 文案从 i18n 拿,避免在 zh/en 切到对方英文后首条仍是英文
  const [messages, setMessages] = useState<AgentMsg[]>([
    { id: 0, role: 'assistant', content: t('gui.agent.intro') },
  ]);
  const [live, setLive] = useState(false);
  const [active, setActive] = useState(true);

  // mock 状态 —— v0.5 接真 store
  const stateCount = 16;
  const stateMax = 400;
  const statePct = Math.round((stateCount / stateMax) * 100);
  const tokensUsed = 66406;
  const tokensMax = 155_000;
  const tokensPct = Math.round((tokensUsed / tokensMax) * 100);

  const send = (): void => {
    const text = input.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: prev.length, role: 'user', content: text },
    ]);
    setInput('');
  };

  return (
    <aside className="flex w-[340px] flex-shrink-0 flex-col border-border-default border-l bg-surface">
      {/* ---- Model selector ---- */}
      <div className="relative border-border-default border-b p-2">
        <button
          type="button"
          onClick={() => setModelOpen((v) => !v)}
          className="flex w-full items-center gap-2 rounded-md border border-border-default bg-canvas px-3 py-1.5 text-fg-primary text-xs hover:bg-surface-strong"
        >
          <Cpu className="size-[12px] text-accent" />
          <span className="flex-1 text-left">{t(`gui.agent.models.${model}`)}</span>
          <ChevronDown
            className={`size-[12px] text-fg-tertiary transition-transform ${
              modelOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        {modelOpen && (
          <div className="absolute left-2 right-2 top-full z-20 mt-1 overflow-hidden rounded-md border border-border-default bg-elevated shadow-lg">
            {MODEL_IDS.map((id) => {
              const selected = id === model;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setModel(id);
                    setModelOpen(false);
                  }}
                  className={[
                    'flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-xs hover:bg-surface-strong',
                    selected ? 'bg-accent/10' : '',
                  ].join(' ')}
                >
                  <span className="font-medium text-fg-primary">
                    {t(`gui.agent.models.${id}`)}
                  </span>
                  <span className="text-fg-tertiary text-[10px]">
                    {t(`gui.agent.modelDescs.${id}`)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Messages (scroll) ---- */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="flex flex-col gap-2">
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
                {m.role === 'user' ? <User className="size-[10px]" /> : <Bot className="size-[10px]" />}
                {m.role === 'user' ? t('gui.agent.you') : t('gui.agent.assistant')}
              </div>
              <div className="whitespace-pre-wrap text-fg-primary">{m.content}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Input ---- */}
      <div className="border-border-default border-t p-2">
        <div className="rounded-md border border-border-default bg-canvas">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={3}
            placeholder={t('gui.agent.inputPlaceholder')}
            className="block w-full resize-none bg-transparent px-3 py-2 text-fg-primary text-xs leading-relaxed outline-none placeholder:text-fg-tertiary"
          />
          <div className="flex items-center justify-between border-border-default border-t px-2 py-1.5">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={t('gui.agent.attach')}
                title={t('gui.agent.attach')}
                className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
              >
                <Paperclip className="size-[12px]" />
              </button>
              <button
                type="button"
                aria-label={t('gui.agent.voice')}
                title={t('gui.agent.voice')}
                className="flex h-6 w-6 items-center justify-center rounded text-fg-tertiary hover:bg-surface-strong hover:text-fg-primary"
              >
                <Mic className="size-[12px]" />
              </button>
            </div>
            <button
              type="button"
              onClick={send}
              aria-label={t('gui.agent.send')}
              title={t('gui.agent.send')}
              className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-fg-on-accent hover:bg-accent-hover disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Send className="size-[11px]" />
            </button>
          </div>
        </div>
      </div>

      {/* ---- Status bar ---- */}
      <div className="flex flex-col gap-1.5 border-border-default border-t p-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setLive((v) => !v)}
            className={[
              'flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors',
              live
                ? 'border-accent bg-accent text-fg-on-accent'
                : 'border-border-default bg-canvas text-fg-secondary hover:bg-surface-strong',
            ].join(' ')}
          >
            <Radio className="size-[10px]" />
            {t('gui.agent.goLive')}
          </button>
          <button
            type="button"
            onClick={() => setActive((v) => !v)}
            className={[
              'flex h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors',
              active
                ? 'border-status-success bg-status-success/15 text-status-success'
                : 'border-border-default bg-canvas text-fg-secondary hover:bg-surface-strong',
            ].join(' ')}
          >
            <Power className="size-[10px]" />
            {t('gui.agent.activate')}
          </button>
        </div>

        <div className="flex items-center justify-between text-fg-tertiary text-[10px]">
          <span className="font-mono">
            {t('gui.agent.agentState', { count: stateCount, max: stateMax, pct: statePct })}
          </span>
          <span className="font-mono">
            {t('gui.agent.tokenUsage', { used: tokensUsed.toLocaleString(), pct: tokensPct })}
          </span>
        </div>

        <div className="flex flex-col gap-0.5">
          <div className="h-1 overflow-hidden rounded bg-canvas">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${statePct}%` }}
            />
          </div>
          <div className="h-1 overflow-hidden rounded bg-canvas">
            <div
              className="h-full bg-status-success transition-all"
              style={{ width: `${tokensPct}%` }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
