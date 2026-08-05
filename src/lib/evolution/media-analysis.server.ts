// Abstração multimodal: transforma mídia em contexto textual para a IA.
// Reutiliza o mesmo gateway/chave já usados pelo projeto (LOVABLE_API_KEY).

import { transcribeAudio } from "@/lib/ai-audio.server";
import type { DownloadedMedia } from "./media.server";
import type { MediaAnalysisResult, MediaSourceType } from "./media-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const VISION_MODEL = "google/gemini-3.6-flash";

const IMAGE_PROMPT =
  "Descreva objetivamente, em português, o que aparece nesta imagem, focando no que é útil para um salão de beleza (cabelo, unhas, maquiagem, comprovantes, prints de agendamento). Máximo 2 frases. NÃO transcreva nem descreva dados sensíveis como CPF completo, número de cartão, senha ou dados bancários — apenas indique que existe um documento, se for o caso.";

const VIDEO_PROMPT =
  "Resuma objetivamente, em português, o conteúdo deste vídeo curto: o que é mostrado visualmente e o que é falado. Máximo 3 frases. Não descreva dados sensíveis (documentos, cartões, senhas).";

const DOC_PROMPT =
  "Resuma em português o conteúdo relevante deste documento para atendimento de um salão de beleza. Máximo 3 frases. Não reproduza dados sensíveis completos (CPF, cartão, dados bancários) — mencione apenas que existem, se houver.";

function requireKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");
  return key;
}

async function callVision(parts: any[]): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{ role: "user", content: parts }],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`vision_failed_${res.status}: ${detail.slice(0, 160)}`);
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function dataUrl(media: DownloadedMedia): string {
  return `data:${media.mimeType};base64,${Buffer.from(media.bytes).toString("base64")}`;
}

/**
 * Converte mídia em texto/descrição utilizável pela conversa.
 * Nunca lança: falhas retornam success=false com warnings.
 */
export async function analyzeMediaForConversation(params: {
  sourceType: Exclude<MediaSourceType, "text">;
  media: DownloadedMedia;
  caption?: string;
  fileName?: string;
}): Promise<MediaAnalysisResult> {
  const base: MediaAnalysisResult = {
    success: false,
    sourceType: params.sourceType,
    extractedText: "",
    confidence: 0,
    warnings: [],
  };

  try {
    if (params.sourceType === "audio") {
      const transcription = (await transcribeAudio(params.media.bytes, params.media.mimeType)).trim();
      if (!transcription) return { ...base, warnings: ["empty_transcription"] };
      const confidence = transcription.length >= 8 ? 0.9 : 0.5;
      return {
        ...base,
        success: true,
        transcription,
        confidence,
        extractedText: `[Áudio transcrito]\n${transcription}`,
        warnings: confidence < 0.7 ? ["low_confidence"] : [],
      };
    }

    if (params.sourceType === "image") {
      const description = await callVision([
        { type: "text", text: IMAGE_PROMPT },
        { type: "image_url", image_url: { url: dataUrl(params.media) } },
      ]);
      if (!description) return { ...base, warnings: ["empty_description"] };
      return {
        ...base,
        success: true,
        visualDescription: description,
        confidence: 0.85,
        extractedText:
          `[Imagem enviada pelo cliente]\nDescrição: ${description}` +
          (params.caption ? `\nLegenda: ${params.caption}` : ""),
      };
    }

    if (params.sourceType === "video") {
      const summary = await callVision([
        { type: "text", text: VIDEO_PROMPT },
        {
          type: "file",
          file: { filename: params.fileName || "video.mp4", file_data: dataUrl(params.media) },
        },
      ]);
      if (!summary) return { ...base, warnings: ["empty_video_summary"] };
      return {
        ...base,
        success: true,
        visualDescription: summary,
        confidence: 0.75,
        extractedText:
          `[Vídeo enviado pelo cliente]\nResumo: ${summary}` +
          (params.caption ? `\nLegenda: ${params.caption}` : ""),
      };
    }

    // Documento
    const summary = await callVision([
      { type: "text", text: DOC_PROMPT },
      {
        type: "file",
        file: { filename: params.fileName || "documento.pdf", file_data: dataUrl(params.media) },
      },
    ]);
    if (!summary) return { ...base, warnings: ["empty_document_summary"] };
    return {
      ...base,
      success: true,
      confidence: 0.8,
      extractedText:
        `[Documento enviado pelo cliente]\nResumo: ${summary}` +
        (params.caption ? `\nLegenda: ${params.caption}` : ""),
    };
  } catch (error) {
    return {
      ...base,
      warnings: [error instanceof Error ? error.message.slice(0, 120) : "analysis_error"],
    };
  }
}
