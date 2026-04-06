"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Square, Wrench, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store";
import { streamChat, sendMessage } from "@/lib/hermes";
import type { Message } from "@/lib/types";
import clsx from "clsx";

function uid() {
  return Math.random().toString(36).slice(2, 12);
}

function ToolCallBadge({ text }: { text: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded my-0.5"
      style={{
        background: "rgba(240,165,0,0.07)",
        border: "1px solid rgba(240,165,0,0.15)",
        color: "var(--amber)",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <Wrench size={10} />
      {text}
    </span>
  );
}

function MessageContent({ content, streaming }: { content: string; streaming?: boolean }) {
  // Split out tool progress lines like `🔧 cmd` from normal text
  const parts = content.split(/(`[🔧💻🔍🌐📁✍️⚙️][^`]+`)/g);
  return (
    <div>
      {parts.map((part, i) => {
        const toolMatch = part.match(/^`([🔧💻🔍🌐📁✍️⚙️].+)`$/);
        if (toolMatch) return <div key={i}><ToolCallBadge text={toolMatch[1]} /></div>;
        // Render code blocks
        const codeMatch = part.match(/```(\w*)\n([\s\S]*?)```/g);
        if (codeMatch) {
          return (
            <pre
              key={i}
              className="mt-2 mb-2 p-3 rounded text-xs overflow-x-auto"
              style={{ background: "var(--surface-0)", border: "1px solid var(--border)", color: "var(--jade)" }}
            >
              <code>{part.replace(/```\w*\n?/g, "").replace(/```/g, "")}</code>
            </pre>
          );
        }
        return <span key={i}>{part}</span>;
      })}
      {streaming && <span className="cursor" />}
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";

  if (isSystem) return null;

  return (
    <div className={clsx("flex gap-3 msg-enter", isUser ? "flex-row-reverse" : "flex-row")} >
      {/* Avatar */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded flex items-center justify-center text-xs font-bold mt-0.5"
        style={{
          background: isUser ? "rgba(56,189,248,0.15)" : "rgba(240,165,0,0.12)",
          border: `1px solid ${isUser ? "rgba(56,189,248,0.2)" : "rgba(240,165,0,0.2)"}`,
          color: isUser ? "var(--sky)" : "var(--amber)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.6rem",
        }}
      >
        {isUser ? "YOU" : "H"}
      </div>

      {/* Bubble */}
      <div
        className={clsx("max-w-[78%] px-3.5 py-2.5 rounded-lg text-sm leading-relaxed", isUser && "ml-auto")}
        style={{
          background: isUser ? "rgba(56,189,248,0.06)" : "var(--surface-2)",
          border: `1px solid ${isUser ? "rgba(56,189,248,0.12)" : "var(--border)"}`,
          color: "var(--text-primary)",
          borderTopRightRadius: isUser ? 4 : undefined,
          borderTopLeftRadius: !isUser ? 4 : undefined,
        }}
      >
        <MessageContent content={message.content} streaming={message.streaming} />
        <div
          className="mt-1.5 text-right"
          style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

function WelcomeState() {
  const { settings, status } = useStore();
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
      <div
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold"
        style={{ background: "rgba(240,165,0,0.1)", border: "1px solid rgba(240,165,0,0.2)", color: "var(--amber)", fontFamily: "'Space Grotesk', sans-serif" }}
      >
        H
      </div>
      <div>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-primary)", fontFamily: "'Space Grotesk', sans-serif" }}>
          Hermes Studio
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {status.connected
            ? `Connected to ${settings.gatewayUrl} — send a message to start`
            : "Not connected. Open Settings to configure your gateway URL and API key."}
        </p>
      </div>
      {!status.connected && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded text-xs"
          style={{ background: "rgba(255,77,109,0.07)", border: "1px solid rgba(255,77,109,0.15)", color: "var(--rose)" }}
        >
          <AlertTriangle size={12} />
          Gateway offline — check Settings
        </div>
      )}
      <div className="text-xs mt-2 space-y-1" style={{ color: "var(--text-dim)", fontFamily: "'JetBrains Mono', monospace" }}>
        <div>hermes gateway  # start hermes first</div>
        <div>API_SERVER_ENABLED=true in ~/.hermes/.env</div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const {
    messages, addMessage, updateMessage, clearMessages,
    settings, activeConversation, status
  } = useStore();

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  function autoResize() {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }

  function buildHistory() {
    return messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as string, content: m.content }));
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    const userMsg: Message = {
      id: uid(),
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addMessage(userMsg);

    const assistantId = uid();
    addMessage({
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
      streaming: true,
    });

    setSending(true);

    const history = [...buildHistory(), { role: "user", content: text }];

    if (settings.streamingEnabled) {
      let accumulated = "";
      await streamChat(settings, history, activeConversation, {
        onToken: (token) => {
          accumulated += token;
          updateMessage(assistantId, { content: accumulated });
        },
        onToolCall: () => {},
        onDone: (full) => {
          updateMessage(assistantId, { content: full || accumulated, streaming: false });
          setSending(false);
        },
        onError: (err) => {
          updateMessage(assistantId, {
            content: `⚠ Error: ${err}`,
            streaming: false,
          });
          setSending(false);
        },
      });
    } else {
      try {
        const content = await sendMessage(settings, history, activeConversation);
        updateMessage(assistantId, { content, streaming: false });
      } catch (e: unknown) {
        updateMessage(assistantId, { content: `⚠ Error: ${e instanceof Error ? e.message : String(e)}`, streaming: false });
      } finally {
        setSending(false);
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const isEmpty = messages.filter(m => m.role !== "system").length === 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {isEmpty ? (
          <WelcomeState />
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Divider */}
      <div className="divider" />

      {/* Input area */}
      <div className="px-4 py-3 flex-shrink-0" style={{ background: "var(--surface-1)" }}>
        <div
          className="flex gap-2 items-end rounded-lg p-1.5"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); autoResize(); }}
            onKeyDown={onKeyDown}
            placeholder={status.connected ? "Message Hermes… (Enter to send, Shift+Enter for newline)" : "Connect gateway to chat…"}
            disabled={!status.connected || sending}
            rows={1}
            className="flex-1 bg-transparent text-sm px-2 py-1.5 resize-none focus:outline-none chat-textarea"
            style={{
              color: "var(--text-primary)",
              fontFamily: "'IBM Plex Sans', sans-serif",
              minHeight: "40px",
              maxHeight: "200px",
              overflow: "auto",
            }}
          />
          <button
            onClick={sending ? undefined : send}
            disabled={!input.trim() || !status.connected}
            className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center transition-all mb-0.5"
            style={{
              background: sending
                ? "rgba(255,77,109,0.1)"
                : input.trim() && status.connected
                  ? "var(--amber)"
                  : "var(--surface-3)",
              color: sending
                ? "var(--rose)"
                : input.trim() && status.connected
                  ? "var(--surface-0)"
                  : "var(--text-dim)",
              border: "1px solid transparent",
            }}
          >
            {sending ? <Square size={13} /> : <Send size={13} />}
          </button>
        </div>
        <div
          className="mt-1.5 px-1 flex items-center justify-between"
          style={{ color: "var(--text-dim)", fontSize: "0.62rem", fontFamily: "'JetBrains Mono', monospace" }}
        >
          <span>
            {activeConversation ? `session: ${activeConversation}` : "no session — messages are stateless"}
          </span>
          <span>{input.length > 0 ? `${input.length} chars` : "↵ send  ⇧↵ newline"}</span>
        </div>
      </div>
    </div>
  );
}
