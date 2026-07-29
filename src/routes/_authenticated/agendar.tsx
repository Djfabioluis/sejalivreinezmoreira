import { createFileRoute, Link } from "@tanstack/react-router";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

import { ArrowLeft, Bot, Send, User, Loader2, Volume2, VolumeX } from "lucide-react";
import { SandboxToggle, SandboxBanner } from "@/components/sandbox-toggle";
import { getSandbox, subscribeSandbox } from "@/lib/sandbox";
import { MicRecorder } from "@/components/mic-recorder";
import { useServerFn } from "@tanstack/react-start";
import { getWelcomeMessage, DEFAULT_WELCOME } from "@/lib/welcome.functions";
import { supabase } from "@/integrations/supabase/client";
import { sanitizeCustomerText } from "@/lib/text-sanitize";

export const Route = createFileRoute("/_authenticated/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar atendimento — Secretária virtual" },
      {
        name: "description",
        content:
          "Converse com a secretária virtual para agendar seu atendimento em segundos.",
      },
      { property: "og:title", content: "Agendar atendimento — Secretária virtual" },
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

function buildInitialMessage(text: string): UIMessage {
  return {
    id: "welcome",
    role: "assistant",
    parts: [{ type: "text", text }],
  };
}

function AgendarPage() {
  const fetchWelcome = useServerFn(getWelcomeMessage);
  const [welcomeText, setWelcomeText] = useState(DEFAULT_WELCOME);
  const [welcomeLoaded, setWelcomeLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [sandbox, setSandboxState] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const spokenRef = useRef<Set<string>>(new Set());
  // Só toca TTS quando a última entrada do usuário foi por voz.
  const lastInputWasVoiceRef = useRef(false);

  useEffect(() => {
    setSandboxState(getSandbox());
    return subscribeSandbox(setSandboxState);
  }, []);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { sandbox },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [sandbox],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: sandbox ? "agendar-sandbox" : "agendar-session",
    messages: [buildInitialMessage(welcomeText)],
    transport,
  });

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWelcome();
        setWelcomeText(data.conteudo);
        setMessages((prev) => {
          if (prev.length <= 1) return [buildInitialMessage(data.conteudo)];
          return prev;
        });
      } catch {
        // mantém padrão
      } finally {
        setWelcomeLoaded(true);
      }
    })();
  }, [fetchWelcome, setMessages]);
  void welcomeLoaded;

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

  // Auto-play TTS for finished assistant messages (once each).
  const playAudio = useCallback(async (id: string, text: string) => {
    if (!voiceOn || !text.trim()) return;
    if (spokenRef.current.has(id)) return;
    spokenRef.current.add(id);
    try {
      setSpeakingId(id);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = audioRef.current ?? new Audio();
      audioRef.current = audio;
      audio.src = url;
      audio.onended = () => {
        setSpeakingId((cur) => (cur === id ? null : cur));
        URL.revokeObjectURL(url);
      };
      await audio.play().catch(() => {
        setSpeakingId(null);
      });
    } catch (e) {
      console.error("[tts] falha", e);
      setSpeakingId((cur) => (cur === id ? null : cur));
    }
  }, [voiceOn]);

  useEffect(() => {
    if (busy) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    // Validação: só sintetiza voz se o cliente enviou áudio por último.
    if (!lastInputWasVoiceRef.current) {
      spokenRef.current.add(last.id); // marca como consumido para não tocar depois
      return;
    }
    const text = last.parts
      .filter((p) => p.type === "text")
      .map((p) => sanitizeCustomerText((p as { text: string }).text))
      .join(" ")
      .trim();
    if (text) {
      lastInputWasVoiceRef.current = false; // consome o "modo voz" para esta resposta
      void playAudio(last.id, text);
    }
  }, [messages, busy, playAudio]);

  const toggleVoice = () => {
    setVoiceOn((v) => {
      if (v && audioRef.current) {
        audioRef.current.pause();
        setSpeakingId(null);
      }
      return !v;
    });
  };

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    lastInputWasVoiceRef.current = false;
    await sendMessage({ text });
  }

  async function submitVoice(text: string) {
    if (busy) return;
    lastInputWasVoiceRef.current = true;
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleVoice}
            title={voiceOn ? "Silenciar voz" : "Ativar voz"}
          >
            {voiceOn ? (
              <Volume2 className={`h-4 w-4 ${speakingId ? "text-primary animate-pulse" : ""}`} />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
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
          <MicRecorder disabled={busy} onTranscript={submitVoice} />
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
          const text = sanitizeCustomerText((p as { text: string }).text);
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
