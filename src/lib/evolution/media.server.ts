// Download e validação de mídia da Evolution API. Server-only.
// Nunca aceita URL arbitrária do cliente: a mídia é sempre obtida pela
// própria Evolution usando instância + messageId e a API key do backend.

import { getEvolutionConfig } from "@/lib/evolution.server";
import {
  ALLOWED_MIME,
  BLOCKED_EXTENSIONS,
  MEDIA_LIMITS,
  type MediaSourceType,
  type NormalizedIncomingMessage,
} from "./media-types";

export interface ValidationResult {
  ok: boolean;
  reason?: "mime" | "size" | "duration" | "extension" | "unsupported";
  message?: string;
}

export interface DownloadedMedia {
  bytes: Uint8Array;
  mimeType: string;
  size: number;
}

/** Valida metadados ANTES de baixar qualquer byte. */
export function validateMediaMetadata(
  msg: NormalizedIncomingMessage,
): ValidationResult {
  if (msg.messageType === "text") return { ok: false, reason: "unsupported" };
  const kind = msg.messageType as Exclude<MediaSourceType, "text">;
  const limits = MEDIA_LIMITS[kind];

  if (msg.fileName && BLOCKED_EXTENSIONS.test(msg.fileName)) {
    return { ok: false, reason: "extension", message: "Extensão não permitida." };
  }

  const mime = (msg.mimeType || "").split(";")[0].trim();
  if (!mime || !ALLOWED_MIME[kind].test(mime)) {
    return { ok: false, reason: "mime", message: "Tipo de arquivo não suportado." };
  }

  if (msg.fileSize && msg.fileSize > limits.maxBytes) {
    return { ok: false, reason: "size", message: "Arquivo acima do limite." };
  }

  if (limits.maxDuration > 0 && msg.duration && msg.duration > limits.maxDuration) {
    return { ok: false, reason: "duration", message: "Duração acima do limite." };
  }

  return { ok: true };
}

/** Baixa a mídia via Evolution (base64) respeitando o limite de tamanho. */
export async function downloadEvolutionMedia(params: {
  instance: string;
  messageId: string;
  kind: Exclude<MediaSourceType, "text">;
  expectedMime?: string;
}): Promise<DownloadedMedia | null> {
  const { url, apiKey } = await getEvolutionConfig();
  if (!url || !apiKey) return null;

  const endpoint = `${url}/chat/getBase64FromMediaMessage/${encodeURIComponent(params.instance)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: { key: { id: params.messageId } },
      convertToMp4: false,
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as
    | { base64?: string; mimetype?: string; mediaType?: string }
    | null;
  const b64 = data?.base64;
  if (!b64) return null;

  const limit = MEDIA_LIMITS[params.kind].maxBytes;
  // Estimativa a partir do base64 evita materializar buffers gigantes.
  if (b64.length * 0.75 > limit) return null;

  const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
  if (bytes.byteLength > limit) return null;

  return {
    bytes,
    mimeType: (data?.mimetype || params.expectedMime || "").split(";")[0] || "application/octet-stream",
    size: bytes.byteLength,
  };
}

/**
 * "Armazenamento temporário": a mídia vive apenas no escopo do processamento.
 * Nada é gravado em disco nem em bucket público.
 */
const tempStore = new Map<string, DownloadedMedia>();

export function storeTemporaryMedia(key: string, media: DownloadedMedia) {
  tempStore.set(key, media);
}

export function getTemporaryMedia(key: string) {
  return tempStore.get(key);
}

export function deleteTemporaryMedia(key: string) {
  tempStore.delete(key);
}
