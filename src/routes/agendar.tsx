import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import { ArrowLeft, Bot, Send, User, Loader2 } from "lucide-react";
import { SandboxToggle, SandboxBanner } from "@/components/sandbox-toggle";
import { getSandbox, subscribeSandbox } from "@/lib/sandbox";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar consulta — Secretária virtual" },
      {
        name: "description",
        content:
          "Converse com a secretária virtual para agendar sua consulta em segundos.",
      },
      { property: "og:title", content: "Agendar consulta — Secretária virtual" },
      {
        property: "og:description",
        content: "Fluxo conversacional que cria seu agendamento direto na Bemp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendarPage,
});

const INITIAL_MESSAGE: UIMessage = {
  id: "welcome",
  role: "assistant",
  parts: [
    {
      type: "text",
      text:
        "Oi! 👋 Sou a secretária virtual do consultório. Vou te ajudar a agendar sua consulta em pouquinhos passos. Para começar, como posso te chamar?",
    },
  ],
};

function AgendarPage() {
  const [input, setInput] = useState("");
  const [sandbox, setSandboxState] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSandboxState(getSandbox());
    return subscribeSandbox(setSandboxState);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sandbox },
      }),
    [sandbox],
  );

  const { messages, sendMessage, status, error } = useChat({
    id: sandbox ? "agendar-sandbox" : "agendar-session",
    messages: [INITIAL_MESSAGE],
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!busy) textareaRef.current?.focus();
  }, [busy]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await sendMessage({ text });
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SandboxBanner />
      <header className="border-b bg-card">
        <div className="mx-auto max-w-3xl px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-semibold tracking-tight truncate">
              Secretária virtual
            </h1>
            <p className="text-xs text-muted-foreground truncate">
              Agendamento integrado à Bemp
            </p>
          </div>
          <SandboxToggle compact />
        </div>
      </header>


      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-4 py-6 space-y-4">
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} />
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground pl-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Pensando…
            </div>
          )}
          {error && (
            <p className="text-sm text-destructive px-2">
              Erro: {error.message}
            </p>
          )}
        </div>
      </main>

      <div className="border-t bg-card">
        <form
          onSubmit={submit}
          className="mx-auto max-w-3xl px-4 py-3 flex gap-2 items-end"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder="Escreva sua mensagem…"
            rows={1}
            className="resize-none min-h-[44px] max-h-40"
            disabled={busy}
          />
          <Button type="submit" size="icon" disabled={busy || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";
  const textParts = message.parts.filter((p) => p.type === "text");

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="rounded-full bg-primary text-primary-foreground h-8 w-8 flex items-center justify-center shrink-0">
          <Bot className="h-4 w-4" />
        </div>
      )}
      <div className={`max-w-[80%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        {textParts.map((p, i) => {
          const text = (p as { text: string }).text;
          if (!text) return null;
          return isUser ? (
            <div
              key={i}
              className="rounded-2xl rounded-br-sm px-4 py-2 bg-primary text-primary-foreground text-sm whitespace-pre-wrap break-words"
            >
              {text}
            </div>
          ) : (
            <Card
              key={i}
              className="px-4 py-3 text-sm whitespace-pre-wrap break-words leading-relaxed"
            >
              {text}
            </Card>
          );
        })}
      </div>
      {isUser && (
        <div className="rounded-full bg-secondary text-secondary-foreground h-8 w-8 flex items-center justify-center shrink-0">
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
