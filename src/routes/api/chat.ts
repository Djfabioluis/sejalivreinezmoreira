import { createFileRoute } from "@tanstack/react-router";
import { type UIMessage } from "ai";
import { streamAgent } from "@/lib/chat.server";

type ChatBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
        try {
          const result = await streamAgent(uiMessages);
          return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
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
