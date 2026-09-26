/**
 * AgentPanel —— AI Agent 聊天面板(嵌入在右栏 agent tab 中)。
 *
 * 三段:Agent 选择 / 快捷提示 / 消息流 + 输入。
 */

import { useEffect, useRef, useState } from "react";

import { Icons } from "@/components/icons";
import { AGENTS, WORKFLOW_HINTS } from "@/components/constants";
import type { AgentMessage, HomeTab } from "@/components/types";
import type { Translator } from "@/components/useT";

interface AgentPanelProps {
  activeTab: HomeTab;
  t: Translator;
}

export const AgentPanel = ({ activeTab, t }: AgentPanelProps) => {
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isThinking) return;

    const userMessage: AgentMessage = { id: Date.now(), role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsThinking(true);

    window.setTimeout(() => {
      const responses: Record<string, string> = {
        claude: "我来帮你分析当前配置...",
        codex: "基于你的选择，我建议修改以下参数...",
        gemini: "这是一个很好的起点，让我补充细节...",
      };
      const agentMessage: AgentMessage = {
        id: Date.now() + 1,
        role: "assistant",
        content: responses[selectedAgent.id] ?? "有什么可以帮你的？",
        code: `// 建议配置\nconfig = {\n    "design": "toy",\n    "nTiles": ${Math.floor(Math.random() * 4) + 1},\n}`,
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsThinking(false);
    }, 1200);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  const hints = WORKFLOW_HINTS[activeTab] ?? WORKFLOW_HINTS.chip;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Agent Selector */}
      <div className="flex gap-1.5 border-b border-border px-3 py-2.5">
        {AGENTS.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent)}
            className={`flex flex-1 items-center gap-1 rounded-md border px-2 py-1.5 text-foreground transition ${
              selectedAgent.id === agent.id
                ? "border-emerald-500/30 bg-emerald-500/10"
                : "border-border bg-background"
            }`}
          >
            <div
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white"
              style={{ background: agent.color }}
            >
              {agent.icon}
            </div>
            <span className="text-[11px] font-medium">{agent.name}</span>
          </button>
        ))}
      </div>

      {/* Quick Hints */}
      <div className="border-b border-border bg-background px-3 py-2.5">
        <div className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {t("quickActions")}
        </div>
        <div className="flex flex-wrap gap-1">
          {hints.map((hint, i) => (
            <button
              key={i}
              onClick={() => setInput(hint + "？")}
              className="rounded-full border border-border bg-secondary px-2 py-1 text-[10px] text-muted-foreground transition hover:bg-accent"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3">
        {messages.length === 0 ? (
          <div className="px-2 py-4 text-center text-muted-foreground">
            <Icons.Bot size={28} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">{t("agentWelcome")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className="flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white"
                  style={{
                    background: msg.role === "user" ? "#10b981" : selectedAgent.color,
                  }}
                >
                  {msg.role === "user" ? "U" : selectedAgent.icon}
                </div>
                <div className="max-w-[85%] rounded-md border border-border bg-secondary p-2 text-[11px] leading-snug">
                  <div>{msg.content}</div>
                  {msg.code && (
                    <div className="mt-1.5 overflow-hidden rounded bg-zinc-950">
                      <div className="flex justify-end border-b border-zinc-800 px-1.5 py-1">
                        <button
                          onClick={() => copyCode(msg.code!)}
                          className="flex items-center gap-1 text-[9px] text-zinc-400 transition hover:text-zinc-200"
                        >
                          <Icons.Copy size={9} /> {t("copyCode")}
                        </button>
                      </div>
                      <pre className="m-0 overflow-auto p-1.5 font-mono text-[10px] text-zinc-300">
                        {msg.code}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-1.5">
                <div
                  className="flex h-[22px] w-[22px] items-center justify-center rounded text-[9px] font-semibold text-white"
                  style={{ background: selectedAgent.color }}
                >
                  {selectedAgent.icon}
                </div>
                <div className="rounded-md border border-border bg-secondary p-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground"
                        style={{ animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-background p-2.5">
        <div className="flex items-end gap-1.5 rounded-md border border-border bg-secondary p-1.5">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("sendMessage")}
            rows={1}
            className="max-h-[60px] flex-1 resize-none border-none bg-transparent text-[11px] text-foreground outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isThinking}
            className="flex items-center rounded bg-emerald-500 px-2 py-1 text-white transition disabled:opacity-50"
          >
            <Icons.Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};

// (Button 不再需要 import —— 已在上方清理)
