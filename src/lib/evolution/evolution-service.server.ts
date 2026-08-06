import { 
  sendEvolutionText, 
  sendEvolutionPresence, 
  sendEvolutionAudio,
  getEvolutionConfig 
} from "../evolution.server";
import { logger } from "../observability/logger.server";
import { AppError } from "../core/errors";

export interface EvolutionResponse {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  error?: string;
}

/**
 * EvolutionService: Camada central para WhatsApp via Evolution API.
 * Centraliza tratamento de erros, logs e padrões de dados.
 */
export class EvolutionService {
  static async sendText(params: {
    instance: string;
    to: string;
    text: string;
    typingMs?: number;
    module: string;
  }): Promise<EvolutionResponse> {
    const startedAt = Date.now();
    logger.info("WA_SEND_TEXT_START", `Sending text to ${params.to}`, { module: params.module });

    try {
      const success = await sendEvolutionText(params.instance, params.to, params.text, params.typingMs);
      
      const durationMs = Date.now() - startedAt;
      if (success) {
        logger.info("WA_SEND_TEXT_SUCCESS", `Sent successfully to ${params.to}`, { durationMs, module: params.module });
        return { success: true };
      } else {
        logger.warn("WA_SEND_TEXT_FAILED", `Evolution API returned failure for ${params.to}`, { module: params.module });
        return { success: false, errorCode: "SEND_FAILURE", error: "A API do WhatsApp retornou erro no envio." };
      }
    } catch (error: any) {
      logger.error("WA_SEND_TEXT_ERROR", error.message, { to: params.to, module: params.module, error });
      throw new AppError({
        code: "WA_SEND_ERROR",
        message: error.message || "Erro interno ao enviar mensagem de WhatsApp.",
        safeMessage: "Não foi possível enviar a mensagem para o WhatsApp.",
        cause: error
      });
    }
  }

  static async setPresence(instance: string, to: string, presence: "composing" | "recording") {
    try {
      await sendEvolutionPresence(instance, to, presence);
    } catch (err: any) {
      logger.warn("WA_PRESENCE_FAILED", `Failed to set presence ${presence} for ${to}`, { error: err.message });
    }
  }
}

