import { bempFetch, getBempConfig, type JsonValue } from "./bemp.server";
import { logger } from "./core-service";
import { z } from "zod";

/**
 * BempService: Camada única para comunicação com a API BEMP.
 * Centraliza tratamento de erros, logs e padrões de dados.
 */
export class BempService {
  private static async fetch<T = JsonValue>(url: string, init?: RequestInit, module = "bemp-service"): Promise<T> {
    const startedAt = Date.now();
    try {
      const data = await bempFetch(url, init);
      logger.info(module, "bemp_request_success", `${init?.method || "GET"} ${url}`, { durationMs: Date.now() - startedAt });
      return data as T;
    } catch (error) {
      logger.error(module, "bemp_request_failed", error instanceof Error ? error.message : "Erro na BEMP", { 
        url, 
        method: init?.method,
        durationMs: Date.now() - startedAt 
      });
      throw error;
    }
  }

  static async listSalons() {
    const cfg = await getBempConfig();
    return this.fetch(`${cfg.apiBase}/salons`, undefined, "bemp-salons");
  }

  static async listServices(salonId: string | number) {
    const cfg = await getBempConfig();
    return this.fetch(`${cfg.apiBase}/salons/${salonId}/services`, undefined, "bemp-services");
  }

  static async listProfessionals(salonId: string | number, serviceId: string | number) {
    const cfg = await getBempConfig();
    return this.fetch(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/professionals`, undefined, "bemp-professionals");
  }

  static async listAvailableSlots(params: {
    salonId: string | number;
    serviceId: string | number;
    professionalId?: string | number;
    date: string;
  }) {
    const cfg = await getBempConfig();
    let url = `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/slots?date=${params.date}`;
    if (params.professionalId) url += `&professional_id=${params.professionalId}`;
    
    return this.fetch(url, undefined, "bemp-slots");
  }
}
