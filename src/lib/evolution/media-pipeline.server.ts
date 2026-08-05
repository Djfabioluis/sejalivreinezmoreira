// Pipeline de mídia: valida → reserva (idempotência) → baixa → analisa →
// atualiza a mensagem no histórico. Nunca lança: sempre devolve um resultado.

import { logEvent } from "./logger.server";
import {
  MEDIA_FALLBACK_TEXT,
  MEDIA_PLACEHOLDER,
  OVERSIZE_REPLY,
  type MediaSourceType,
  type NormalizedIncomingMessage,
} from "./media-types";
import {
  downloadEvolutionMedia,
  validateMediaMetadata,
  storeTemporaryMedia,
  deleteTemporaryMedia,
} from "./media.server";
import { analyzeMediaForConversation } from "./media-analysis.server";

export interface MediaPipelineOutcome {
  /** Texto que deve ser entregue ao runAgent (vazio = não chamar IA). */
  agentText: string;
  /** Texto de fallback a enviar ao cliente quando a análise falhar. */
  fallbackText?: string;
  status: "analyzed" | "failed" | "rejected" | "duplicate";
  metadata: Record<string, unknown>;
}

export function mediaPlaceholderText(msg: NormalizedIncomingMessage): string {
  if (msg.messageType === "text") return msg.text;
  const base = MEDIA_PLACEHOLDER[msg.messageType as Exclude<MediaSourceType, "text">];
  return msg.caption ? `${base}\n“${msg.caption}”` : base;
}

async function updateMessage(params: {
  conversationKey: string;
  messageId: string;
  metadata: Record<string, unknown>;
  text?: string;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.rpc("update_wa_message_metadata" as any, {
    p_phone: params.conversationKey,
    p_message_id: params.messageId,
    p_metadata: params.metadata,
    p_text: params.text ?? null,
  });
}

export async function processIncomingMedia(params: {
  instance: string;
  messageId: string;
  conversationKey: string;
  normalized: NormalizedIncomingMessage;
}): Promise<MediaPipelineOutcome> {
  const { instance, messageId, conversationKey, normalized } = params;
  const kind = normalized.messageType as Exclude<MediaSourceType, "text">;
  const hash = (normalized.mediaHash || "").slice(0, 80);
  const tempKey = `${instance}:${messageId}:${hash}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const baseMeta = {
    sourceType: kind,
    mimeType: normalized.mimeType ?? null,
    fileName: normalized.fileName ?? null,
    duration: normalized.duration ?? null,
    mediaReference: `${instance}:${messageId}`,
  };

  await logEvent({ instance, messageId, event: "media_received", status: kind });

  // 1. Validação de metadados (antes de qualquer download)
  await logEvent({ instance, messageId, event: "media_validation_started", status: "started" });
  const validation = validateMediaMetadata(normalized);
  if (!validation.ok) {
    await logEvent({
      instance,
      messageId,
      event: "media_validation_failed",
      status: validation.reason ?? "invalid",
    });
    const rejectText =
      validation.reason === "size" || validation.reason === "duration"
        ? OVERSIZE_REPLY
        : MEDIA_FALLBACK_TEXT[kind];
    await updateMessage({
      conversationKey,
      messageId,
      metadata: { ...baseMeta, mediaStatus: "rejected", mediaWarning: validation.reason },
    });
    return { agentText: "", fallbackText: rejectText, status: "rejected", metadata: baseMeta };
  }

  // 2. Reserva atômica (instance + messageId + mediaHash)
  const { data: claimed } = await supabaseAdmin.rpc("evo_claim_media" as any, {
    p_instance: instance,
    p_message_id: messageId,
    p_media_hash: hash,
    p_source_type: kind,
  });

  if (claimed !== true) {
    await logEvent({ instance, messageId, event: "media_analysis_queued", status: "duplicate" });
    return { agentText: "", status: "duplicate", metadata: baseMeta };
  }

  const finish = async (status: string, error?: string) => {
    await supabaseAdmin.rpc("evo_finish_media" as any, {
      p_instance: instance,
      p_message_id: messageId,
      p_media_hash: hash,
      p_status: status,
      p_error: error ?? null,
    });
  };

  try {
    await updateMessage({
      conversationKey,
      messageId,
      metadata: { ...baseMeta, mediaStatus: "processing" },
    });

    // 3. Download
    await logEvent({ instance, messageId, event: "media_download_started", status: "started" });
    const media = await downloadEvolutionMedia({
      instance,
      messageId,
      kind,
      expectedMime: normalized.mimeType,
    });

    if (!media) {
      await logEvent({ instance, messageId, event: "media_analysis_failed", status: "download_failed" });
      await finish("failed", "download_failed");
      await updateMessage({
        conversationKey,
        messageId,
        metadata: { ...baseMeta, mediaStatus: "failed" },
      });
      return {
        agentText: "",
        fallbackText: MEDIA_FALLBACK_TEXT[kind],
        status: "failed",
        metadata: baseMeta,
      };
    }

    storeTemporaryMedia(tempKey, media);
    await logEvent({
      instance,
      messageId,
      event: "media_download_completed",
      status: "success",
      payload: { size: media.size, mime: media.mimeType },
    });

    // 4. Análise
    await logEvent({ instance, messageId, event: "media_analysis_started", status: kind });
    const analysis = await analyzeMediaForConversation({
      sourceType: kind,
      media,
      caption: normalized.caption,
      fileName: normalized.fileName,
    });

    if (!analysis.success || !analysis.extractedText) {
      await logEvent({
        instance,
        messageId,
        event: "media_analysis_failed",
        status: "analysis_failed",
        errorDetail: analysis.warnings.join(",").slice(0, 200) || null,
      });
      await finish("failed", analysis.warnings[0]);
      await updateMessage({
        conversationKey,
        messageId,
        metadata: { ...baseMeta, mediaStatus: "failed" },
      });
      return {
        agentText: "",
        fallbackText: MEDIA_FALLBACK_TEXT[kind],
        status: "failed",
        metadata: baseMeta,
      };
    }

    const completedEvent =
      kind === "audio"
        ? "audio_transcription_completed"
        : kind === "image"
          ? "image_analysis_completed"
          : kind === "video"
            ? "video_analysis_completed"
            : "media_analysis_completed";

    // Logs nunca contêm o conteúdo transcrito/descrito.
    await logEvent({
      instance,
      messageId,
      event: completedEvent,
      status: "success",
      payload: { confidence: analysis.confidence, chars: analysis.extractedText.length },
    });

    const metadata = {
      ...baseMeta,
      mediaStatus: "analyzed",
      transcription: analysis.transcription ?? null,
      visualDescription: analysis.visualDescription ?? null,
      confidence: analysis.confidence,
      caption: normalized.caption || null,
    };

    await updateMessage({
      conversationKey,
      messageId,
      metadata,
      text: analysis.extractedText,
    });

    await finish("analyzed");

    const lowConfidence = analysis.confidence < 0.7;
    const agentText = lowConfidence
      ? `${analysis.extractedText}\n\n[Atenção: a transcrição ficou incerta — confirme o pedido com o cliente antes de prosseguir.]`
      : analysis.extractedText;

    return { agentText, status: "analyzed", metadata };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : "media_pipeline_error";
    await logEvent({
      instance,
      messageId,
      event: "media_analysis_failed",
      status: "error",
      errorDetail: detail,
    });
    await finish("failed", detail);
    await updateMessage({
      conversationKey,
      messageId,
      metadata: { ...baseMeta, mediaStatus: "failed" },
    });
    return {
      agentText: "",
      fallbackText: MEDIA_FALLBACK_TEXT[kind],
      status: "failed",
      metadata: baseMeta,
    };
  } finally {
    // 5. Remoção do arquivo temporário — sempre
    deleteTemporaryMedia(tempKey);
    await logEvent({ instance, messageId, event: "media_temp_deleted", status: "success" });
  }
}
