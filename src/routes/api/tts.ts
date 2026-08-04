// Sintetiza texto em MP3 (voz feminina calma pt-BR). Chamado pelo chat web.
import { createFileRoute } from "@tanstack/react-router";
import { requireSupabaseUser } from "@/lib/http-auth.server";
import { z } from "zod";
import { synthesizeSpeechMp3 } from "@/lib/ai-audio.server";

const Body = z.object({ text: z.string().trim().min(1).max(4000) });

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          await requireSupabaseUser(request);
          const json = await request.json().catch(() => null);
          const parsed = Body.safeParse(json);
          if (!parsed.success) {
            return Response.json({ error: "Texto inválido." }, { status: 400 });
          }
          const mp3 = await synthesizeSpeechMp3(parsed.data.text);
          return new Response(new Uint8Array(mp3), {
            status: 200,
            headers: {
              "Content-Type": "audio/mpeg",
              "Cache-Control": "no-store",
            },
          });
        } catch (err) {
          if (err instanceof Response) return err;
          console.error("[tts] falhou", err);
          const msg = err instanceof Error ? err.message : "Falha ao gerar áudio";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
