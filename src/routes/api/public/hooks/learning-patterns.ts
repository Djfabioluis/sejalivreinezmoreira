import { createFileRoute } from "@tanstack/react-router";

/**
 * Detecção periódica de padrões de aprendizado (cron).
 * Protegido pelo mesmo segredo dos demais jobs internos.
 */
export const Route = createFileRoute("/api/public/hooks/learning-patterns")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["CRON_SECRET"];
        const provided =
          request.headers.get("x-cron-secret") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
          "";
        if (!secret || provided !== secret) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        try {
          const { runLearningPatternDetection } = await import("@/lib/memory/learning.server");
          const metrics = await runLearningPatternDetection(14);
          return new Response(JSON.stringify({ ok: true, metrics }), {
            headers: { "content-type": "application/json" },
          });
        } catch (error) {
          console.error("[learning] pattern detection failed", error);
          return new Response(JSON.stringify({ ok: false, error: "internal_error" }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
