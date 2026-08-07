import { createFileRoute } from "@tanstack/react-router";
import { type UIMessage } from "ai";
import { streamAgent } from "@/lib/chat.server";
import { requireSupabaseUser } from "@/lib/http-auth.server";

type ChatBody = { messages?: unknown; sandbox?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireSupabaseUser(request);
        } catch (res) {
          if (res instanceof Response) return res;
          return new Response("Unauthorized", { status: 401 });
        }
        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }
        if (!Array.isArray(body.messages)) {
          return new Response("messages é obrigatório", { status: 400 });
        }
        const uiMessages = body.messages as UIMessage[];
        const sandbox = body.sandbox === true;
        try {
          const result = await streamAgent({ messages: uiMessages, sandbox });
          return result.toUIMessageStreamResponse({
            originalMessages: uiMessages,
            onError: (err) => {
              const message = err instanceof Error ? err.message : String(err);
              console.error("[chat] stream error:", message);
              return message;
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha desconhecida";
          console.error("[chat] erro no streamText:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
