import { bempFetch, getBempConfig, type JsonValue } from "./bemp.server";
import { logger } from "./observability/logger.server";
import { AppError } from "./core/errors";
import { z } from "zod";
import { normalizeServiceSearchText, SERVICE_CATEGORY_ALIASES, type ServiceCategory } from "./service-utils";


export type BempResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  errorCode?: "NOT_FOUND" | "UNAUTHORIZED" | "RATE_LIMITED" | "BEMP_UNAVAILABLE" | "INVALID_RESPONSE" | "UNIT_NOT_FOUND" | "NO_MATCHING_SERVICES";
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
  static async findCustomerByPhone(params: {
    countryCode: string;
    areaCode: string;
    number: string;
  }): Promise<any> {
    const cfg = await getBempConfig();
    const qs = new URLSearchParams({
      phone_country_code: params.countryCode,
      phone_area_code: params.areaCode,
      phone_number: params.number,
    });
    return this.fetch<any>(`${cfg.apiBase}/whatsapp_customer?${qs.toString()}`, undefined, "bemp-find-customer");
  }

  static async listCustomerSubscriptions(customerId: string | number): Promise<any[]> {
    const cfg = await getBempConfig();
    // Reutiliza o endpoint que retorna dados do cliente incluindo assinaturas
    const result = await this.fetch<any>(`${cfg.apiBase}/customers/${customerId}/subscriptions`, undefined, "bemp-customer-subscriptions");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async searchServicesByCategory(params: {
    effectiveUnitId: string | number;
    category: ServiceCategory;
    query?: string;
  }): Promise<BempResult<any[]>> {
    const traceId = Math.random().toString(36).substring(7);
    const logCtx = { traceId, unitId: params.effectiveUnitId, category: params.category, query: params.query };
    
    logger.info("service_category_search_started", "Iniciando busca de serviços por categoria", logCtx);

    try {
      const services = await this.listServices(params.effectiveUnitId);
      const aliases = SERVICE_CATEGORY_ALIASES[params.category] || [];
      const normalizedQuery = params.query ? normalizeServiceSearchText(params.query) : "";

      const matches = services.filter((s: any) => {
        // Campos para pesquisa conforme requisito 6
        const name = normalizeServiceSearchText(s?.name || s?.service_name || s?.title || "");
        const cat = normalizeServiceSearchText(s?.category || s?.group || "");
        const desc = normalizeServiceSearchText(s?.description || "");
        const tags = Array.isArray(s?.tags) ? s.tags.map((t: any) => normalizeServiceSearchText(String(t))) : [];

        // Regras de correspondência conforme requisito 7
        // 1. Nome exato normalizado (maior prioridade)
        if (normalizedQuery && name === normalizedQuery) return true;
        
        // 2. Categoria exata
        if (cat === normalizeServiceSearchText(params.category)) return true;

        // 3. Nome contém "mecha" (para categoria MECHAS)
        if (params.category === "MECHAS" && name.includes("mecha")) return true;

        // 4. Nome contém alias relacionado
        if (aliases.some(alias => name.includes(normalizeServiceSearchText(alias)))) return true;

        // 5. Descrição ou tag relacionada
        if (aliases.some(alias => desc.includes(normalizeServiceSearchText(alias)))) return true;
        if (tags.some((tag: string) => aliases.some(alias => tag.includes(normalizeServiceSearchText(alias))))) return true;

        return false;
      });

      // Ordenação e priorização conforme requisito 7
      const sortedMatches = matches.sort((a: any, b: any) => {
        const nameA = normalizeServiceSearchText(a?.name || "");
        const nameB = normalizeServiceSearchText(b?.name || "");
        
        const priorityA = (nameA.includes("mecha") || nameA.includes("pacote de mechas")) ? 0 : 1;
        const priorityB = (nameB.includes("mecha") || nameB.includes("pacote de mechas")) ? 0 : 1;

        if (priorityA !== priorityB) return priorityA - priorityB;
        return nameA.localeCompare(nameB);
      });

      // Remover duplicidades (baseado no ID)
      const uniqueMatches = Array.from(new Map(sortedMatches.map((s: any) => [s.id, s])).values());

      logger.info("service_category_search_completed", "Busca de serviços concluída", { ...logCtx, resultsCount: uniqueMatches.length });

      return {
        success: true,
        data: uniqueMatches.map((s: any) => ({
          id: s.id,
          name: s.name || s.service_name || s.title,
          description: s.description,
          duration: s.duration || s.tempo,
          price: s.price || s.valor,
          unitId: String(params.effectiveUnitId),
          category: s.category || s.group,
          active: true // Já filtrado por listServices
        }))
      };
    } catch (error: any) {
      logger.error("service_category_search_failed", error.message, logCtx);
      return {
        success: false,
        errorCode: error.code === "NOT_FOUND" ? "UNIT_NOT_FOUND" : "BEMP_UNAVAILABLE",
        error: error.message
      };
    }
  }
}



