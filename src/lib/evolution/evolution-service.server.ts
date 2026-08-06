import { 
  sendEvolutionText, 
  sendEvolutionPresence, 
  sendEvolutionAudio,
  getEvolutionConfig,
  createInstance,
  deleteInstance,
  getQrCode,
  getConnectionState,
  setWebhook,
  logoutInstance
} from "../evolution.server";
import { logger } from "../observability/logger.server";
import { AppError } from "../core/errors";

export interface EvolutionResponse {
  success: boolean;
  messageId?: string;
  errorCode?: string;
  error?: string;
}

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: string;
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

  static async createAgentInstance(instance: string, webhookUrl: string): Promise<ServiceResult<any>> {
    try {
      logger.info("EVOLUTION_INSTANCE_CREATE_STARTED", `Creating instance: ${instance}`);
      const result = await createInstance(instance, webhookUrl);
      logger.info("EVOLUTION_INSTANCE_CREATED", `Instance created: ${instance}`, { existed: result.existed });
      return { success: true, data: result };
    } catch (error: any) {
      logger.error("EVOLUTION_INSTANCE_CREATE_FAILED", error.message, { instance });
      return { success: false, error: error.message, errorCode: "CREATE_FAILED" };
    }
  }

  static async deleteAgentInstance(instance: string): Promise<ServiceResult<void>> {
    try {
      await deleteInstance(instance);
      logger.info("EVOLUTION_INSTANCE_DELETED", `Instance deleted: ${instance}`);
      return { success: true };
    } catch (error: any) {
      logger.error("EVOLUTION_INSTANCE_DELETE_FAILED", error.message, { instance });
      return { success: false, error: error.message };
    }
  }

  static async getAgentQrCode(instance: string): Promise<ServiceResult<string>> {
    try {
      const qr = await getQrCode(instance);
      if (!qr) return { success: false, error: "QR Code not available" };
      return { success: true, data: qr };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getAgentStatus(instance: string): Promise<ServiceResult<string>> {
    try {
      const state = await getConnectionState(instance);
      return { success: true, data: state };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateAgentWebhook(instance: string, url: string): Promise<ServiceResult<void>> {
    try {
      await setWebhook(instance, url);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async disconnectAgent(instance: string): Promise<ServiceResult<void>> {
    try {
      await logoutInstance(instance);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}


