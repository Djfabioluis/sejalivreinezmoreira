// Helpers de áudio: STT via Gemini (aceita webm/ogg/mp3/wav) e TTS via OpenAI.
// Servidor apenas — usa LOVABLE_API_KEY (nunca expor no cliente).

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

const STT_MODEL = "google/gemini-3.6-flash";
const TTS_MODEL = "openai/gpt-4o-mini-tts";

// Voz feminina calma; instructions guia tom acolhedor em pt-BR.
const TTS_VOICE = "shimmer";
const TTS_INSTRUCTIONS =
  "Você é a Julia, recepcionista do Salão Seja Livre. Fale em português do Brasil com voz feminina, jovem-adulta, acolhedora e muito humana — como uma amiga carinhosa atendendo o cliente. Ritmo natural e variado (nem apressado, nem lento demais), com pequenas pausas de respiração entre frases. Entonação viva e afetiva: suba levemente ao cumprimentar, desça ao confirmar, sorria com a voz. Use micro-hesitações naturais ocasionais ('hmm', 'ah, sim', 'olha') com muita moderação, sem exagero. Pronuncie números, horários e valores com clareza (ex.: 'treze e trinta', 'oitenta reais'). Nunca soe robótica, formal demais ou monótona. Transmita empatia, calma e proximidade em cada frase.";


function requireKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");
  return key;
}

/** Transcreve áudio usando Gemini via chat completions (multimodal). */
export async function transcribeAudio(
  audio: ArrayBuffer | Uint8Array,
  mime: string,
): Promise<string> {
  const key = requireKey();

  // Formato para input_audio: derivado do mime real do arquivo.
  const raw = (mime || "").toLowerCase().split(";")[0];
  const map: Record<string, string> = {
    "audio/webm": "webm",
    "audio/ogg": "ogg",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/mp4": "m4a",
    "audio/x-m4a": "m4a",
    "audio/m4a": "m4a",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/aac": "aac",
    "audio/flac": "flac",
  };
  const format = map[raw] ?? "webm";

  const bytes = audio instanceof Uint8Array ? audio : new Uint8Array(audio);
  const b64 = Buffer.from(bytes).toString("base64");

  const body = {
    model: STT_MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Transcreva literalmente o áudio a seguir em português. Responda apenas com o texto transcrito, sem comentários.",
          },
          { type: "input_audio", input_audio: { data: b64, format } },
        ],
      },
    ],
  };

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`STT falhou (${res.status}): ${t}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim() ?? "";
  return text;
}

/** Gera MP3 (Buffer) com voz feminina calma pt-BR. */
export async function synthesizeSpeechMp3(text: string): Promise<Buffer> {
  const key = requireKey();
  const clean = text.trim();
  if (!clean) throw new Error("Texto vazio para TTS.");

  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TTS_MODEL,
      input: clean.slice(0, 4000),
      voice: TTS_VOICE,
      instructions: TTS_INSTRUCTIONS,
      response_format: "mp3",
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`TTS falhou (${res.status}): ${t}`);
  }
  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
