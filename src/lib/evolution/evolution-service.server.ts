import { 
  sendEvolutionText, 
  sendEvolutionPresence, 
  sendEvolutionAudio,
  getEvolutionConfig 
} from "../evolution.server";
import { logger } from "../core-service";

/**
 * EvolutionService: Camada central para WhatsApp via Evolution API.
 */
export class EvolutionService {
  static async sendText(params: {
    instance: string;
    to: string;
    text: string;
    typingMs?: number;
    module: string;
  }) {
    const startedAt = Date.now();
    try {
      const success = await sendEvolutionText(params.instance, params.to, params.text, params.typingMs);
      if (success) {
        logger.info(params.module, "whatsapp_send_success", `To: ${params.to}`, { durationMs: Date.now() - startedAt });
      } else {
        logger.warn(params.module, "whatsapp_send_failed", `To: ${params.to}`);
      }
      return success;
    } catch (error) {
      logger.error(params.module, "whatsapp_send_error", error instanceof Error ? error.message : "Erro no envio", { to: params.to });
      throw error;
    }
  }

  static async setPresence(instance: string, to: string, presence: "composing" | "recording") {
    try {
      await sendEvolutionPresence(instance, to, presence);
    } catch (err) {
      logger.warn("evolution-service", "presence_failed", String(err));
    }
  }
}
