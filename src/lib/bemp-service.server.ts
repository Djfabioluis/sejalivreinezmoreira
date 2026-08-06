import { bempFetch, getBempConfig, type JsonValue } from "./bemp.server";
import { logger } from "./observability/logger.server";
import { AppError } from "./core/errors";
import { z } from "zod";

export type BempResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: "NOT_FOUND" | "UNAUTHORIZED" | "RATE_LIMITED" | "BEMP_UNAVAILABLE" | "INVALID_RESPONSE";
};

/**
 * BempService: Camada única para comunicação com a API BEMP.
 * Centraliza tratamento de erros, logs e padrões de dados.
 */
export class BempService {
  private static async fetch<T = JsonValue>(url: string, init?: RequestInit, module = "bemp-service"): Promise<T> {
    const startedAt = Date.now();
    logger.debug("BEMP_REQUEST_START", `${init?.method || "GET"} ${url}`, { module });
    
    try {
      const data = await bempFetch(url, init);
      const durationMs = Date.now() - startedAt;
      logger.info("BEMP_REQUEST_SUCCESS", `${init?.method || "GET"} ${url}`, { durationMs, module });
      return data as T;
    } catch (error: any) {
      const durationMs = Date.now() - startedAt;
      logger.error("BEMP_REQUEST_FAILED", error.message, { 
        url, 
        method: init?.method,
        durationMs,
        module,
        status: error.status
      });

      let code = "BEMP_UNAVAILABLE";
      if (error.status === 404) code = "NOT_FOUND";
      if (error.status === 401) code = "UNAUTHORIZED";
      if (error.status === 429) code = "RATE_LIMITED";

      throw new AppError({
        code: code,
        message: error.message || "Erro de comunicação com a API BEMP.",
        safeMessage: "Não foi possível sincronizar com o sistema de agenda (BEMP).",
        statusCode: error.status || 500,
        cause: error
      });
    }
  }

  static async listSalons(): Promise<any[]> {
    const cfg = await getBempConfig();
    const result = await this.fetch<any>(`${cfg.apiBase}/salons`, undefined, "bemp-salons");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async listServices(salonId: string | number): Promise<any[]> {
    const cfg = await getBempConfig();
    const result = await this.fetch<any>(`${cfg.apiBase}/salons/${salonId}/services`, undefined, "bemp-services");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async listProfessionals(salonId: string | number, serviceId: string | number): Promise<any[]> {
    const cfg = await getBempConfig();
    const result = await this.fetch<any>(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/professionals`, undefined, "bemp-professionals");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async listAvailableSlots(params: {
    salonId: string | number;
    serviceId: string | number;
    professionalId?: string | number;
    date: string;
  }): Promise<any[]> {
    const cfg = await getBempConfig();
    let url = `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/slots?date=${params.date}`;
    if (params.professionalId) url += `&professional_id=${params.professionalId}`;
    
    const result = await this.fetch<any>(url, undefined, "bemp-slots");
    return Array.isArray(result) ? result : (result?.data || []);
  }
}

