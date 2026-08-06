import { generateText, generateObject, type CoreMessage } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { z } from "zod";
import { logger } from "./core-service";

export type AIModelType = "flash" | "pro" | "ultra";

/**
 * AIService: Camada central de IA do projeto.
 * Padroniza provider, modelo, temperatura e tratamento de erros.
 */
export class AIService {
  private static getProvider() {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      logger.critical("ai-service", "missing_api_key", "LOVABLE_API_KEY não configurada.");
      throw new Error("Configuração de IA ausente.");
    }
    return createLovableAiGatewayProvider(key);
  }

  private static getModel(type: AIModelType = "flash") {
    // Padronização de modelos conforme auditoria
    const models = {
      flash: "google/gemini-1.5-flash",
      pro: "google/gemini-1.5-pro",
      ultra: "openai/gpt-4o",
    };
    return this.getProvider()(models[type]);
  }

  /** Geração de texto simples com tratamento de erro e logging */
  static async generate(params: {
    system?: string;
    prompt: string;
    messages?: CoreMessage[];
    type?: AIModelType;
    temperature?: number;
    module: string;
  }) {
    const startedAt = Date.now();
    try {
      const { text } = await generateText({
        model: this.getModel(params.type),
        system: params.system,
        prompt: params.prompt,
        messages: params.messages,
        temperature: params.temperature ?? 0.7,
      });

      logger.info(params.module, "ai_generation_success", undefined, { durationMs: Date.now() - startedAt });
      return text;
    } catch (error) {
      logger.error(params.module, "ai_generation_failed", error instanceof Error ? error.message : "Erro desconhecido", { error });
      throw error;
    }
  }

  /** Geração de objetos estruturados via IA com validação Zod */
  static async generateObject<T extends z.ZodTypeAny>(params: {
    system?: string;
    prompt: string;
    schema: T;
    type?: AIModelType;
    module: string;
  }) {
    const startedAt = Date.now();
    try {
      const { object } = await generateObject({
        model: this.getModel(params.type),
        system: params.system,
        prompt: params.prompt,
        schema: params.schema,
      });

      logger.info(params.module, "ai_object_generation_success", undefined, { durationMs: Date.now() - startedAt });
      return object as z.infer<T>;
    } catch (error) {
      logger.error(params.module, "ai_object_generation_failed", error instanceof Error ? error.message : "Erro desconhecido", { error });
      throw error;
    }
  }
}
