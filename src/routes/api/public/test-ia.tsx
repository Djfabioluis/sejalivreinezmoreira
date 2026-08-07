import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { runAgent } from "@/lib/chat.server";
import { sendEvolutionText } from "@/lib/evolution.server";

export const Route = createFileRoute("/api/public/test-ia")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Proteção fail-closed: exige o segredo do servidor, sem fallback embutido.
        const expected = process.env['TEST_ENDPOINT_SECRET'] || process.env['LOVABLE_API_KEY'];
        const secret = request.headers.get("x-test-secret");
        if (!expected || !secret || secret !== expected) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { type, ...params } = body;

        if (type === "runAgent") {
          const { message, contactName, contactPhone, instance, unidadeId } = params;
          try {
            const reply = await runAgent({
              messages: [{ id: "test-1", role: "user", parts: [{ type: "text", text: message }] } as any],
              contactName,
              contactPhone,
              unidadeId,
              unitName: "Unidade Teste",
              customerContext: {}
            });
            return new Response(JSON.stringify({ ok: true, reply }), {
              headers: { "Content-Type": "application/json" }
            });
          } catch (error: any) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
          }
        }

        if (type === "sendEvolutionText") {
          const { instance, phone, text } = params;
          try {
            const sent = await sendEvolutionText(instance, phone, text);
            return new Response(JSON.stringify({ ok: true, sent }), {
              headers: { "Content-Type": "application/json" }
            });
          } catch (error: any) {
            return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
          }
        }

        return new Response("Invalid type", { status: 400 });
      }
    }
  }
});