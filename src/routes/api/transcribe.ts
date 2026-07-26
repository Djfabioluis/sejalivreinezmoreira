// Transcreve um upload de áudio do cliente. Uso interno autenticado não é obrigatório
// (o STT é chamado pelo próprio chat da secretária), mas mantemos limite de tamanho.
import { createFileRoute } from "@tanstack/react-router";
import { transcribeAudio } from "@/lib/ai-audio.server";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const form = await request.formData();
          const file = form.get("audio");
          if (!(file instanceof File)) {
            return Response.json({ error: "Campo 'audio' ausente." }, { status: 400 });
          }
          if (file.size === 0) {
            return Response.json({ error: "Áudio vazio." }, { status: 400 });
          }
          if (file.size > MAX_BYTES) {
            return Response.json({ error: "Áudio muito grande." }, { status: 413 });
          }
          const buf = await file.arrayBuffer();
          const text = await transcribeAudio(buf, file.type || "audio/webm");
          return Response.json({ text });
        } catch (err) {
          console.error("[transcribe] falhou", err);
          const msg = err instanceof Error ? err.message : "Falha ao transcrever";
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
