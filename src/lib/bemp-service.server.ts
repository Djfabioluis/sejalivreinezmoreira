import { bempFetch, getBempConfig, BEMP_WEBHOOK_BASE, PROFESSIONAL_PREFERENCE_NOTE, tryUpdateBempScheduleNote, withProfessionalPreferenceNote, extractBempAppointmentId, type JsonValue } from "./bemp.server";
export { extractBempAppointmentId };

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
  private static async fetchRaw(url: string, init?: RequestInit, module = "bemp-service"): Promise<{ data: any; status: number; bodyLength: number; transportEmpty: boolean }> {
    const cfg = await getBempConfig();
    const startedAt = Date.now();
    const method = (init?.method || "GET").toUpperCase();
    
    try {
      const res = await fetch(url, {
        ...init,
        headers: { ...cfg.headers, ...(init?.headers as Record<string, string> | undefined) },
      });
      
      const status = res.status;
      const text = await res.text();
      const bodyLength = text.length;
      const transportEmpty = bodyLength === 0;
      const durationMs = Date.now() - startedAt;

      let data: any = null;
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      if (!res.ok) {
        throw new AppError({
          code: status === 404 ? "NOT_FOUND" : status === 401 ? "UNAUTHORIZED" : status === 429 ? "RATE_LIMITED" : "BEMP_UNAVAILABLE",
          message: `Bemp ${status}: ${text.slice(0, 100)}`,
          statusCode: status,
          cause: { status, text }
        });
      }

      logger.info("BEMP_REQUEST_SUCCESS", `${method} ${url}`, { durationMs, module, status, bodyLength });
      return { data, status, bodyLength, transportEmpty };
    } catch (error: any) {
      const durationMs = Date.now() - startedAt;
      logger.error("BEMP_REQUEST_FAILED", error.message, { url, method, durationMs, module });
      throw error;
    }
  }

  private static async fetch<T = JsonValue>(url: string, init?: RequestInit, module = "bemp-service"): Promise<T> {
    const { data } = await this.fetchRaw(url, init, module);
    return data as T;
  }


  static async listSalons(): Promise<any[]> {
    const cfg = await getBempConfig();
    const result = await this.fetch<any>(`${cfg.apiBase}/salons`, undefined, "bemp-salons");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async listServices(salonId: string | number): Promise<any[]> {
    const traceId = Math.random().toString(36).substring(7);
    const cfg = await getBempConfig();
    const primaryUrl = `${cfg.apiBase}/salons/${salonId}/services`;
    
    // 1. PRIMARY ATTEMPT
    let services: any[] = [];
    let primarySuccess = false;
    let primaryStatus = 0;
    let primaryBodyLength = 0;
    let transportEmpty = false;

    try {
      const result = await this.fetchRaw(primaryUrl, undefined, "bemp-services");
      primaryStatus = result.status;
      primaryBodyLength = result.bodyLength;
      transportEmpty = result.transportEmpty;
      
      if (!transportEmpty && result.data) {
        services = Array.isArray(result.data) ? result.data : (result.data?.data || []);
        primarySuccess = true;
      }
    } catch (err: any) {
      primaryStatus = err.statusCode || err.status || 500;
      logger.error("BEMP_PRIMARY_FAILED", err.message, { salonId, traceId, status: primaryStatus });
    }

    // 2. FALLBACK ATTEMPT (if primary is empty body OR primary failed)
    // IMPORTANT: transportEmpty = body length 0. [] is NOT transportEmpty.
    const shouldTryFallback = !primarySuccess || transportEmpty;


    let fallbackUsed = false;
    let fallbackStatus = 0;
    let fallbackBodyLength = 0;
    let fallbackCount = 0;

    if (shouldTryFallback) {
      fallbackUsed = true;
      try {
        const origin = process.env.VITE_APP_URL || 'http://localhost:8080';
        const relayUrl = `${origin}/api/public/bemp-services-relay`;
        
        logger.info("BEMP_FALLBACK_START", "Iniciando fallback via relay route", { 
          salonId, 
          traceId, 
          reason: transportEmpty ? "EMPTY_BODY" : "FETCH_ERROR" 
        });
        
        const res = await fetch(relayUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ unitId: salonId })
        });

        fallbackStatus = res.status;
        const text = await res.text();
        fallbackBodyLength = text.length;

        if (res.ok && text) {
          const result = JSON.parse(text);
          const fallbackServices = Array.isArray(result) ? result : (result?.data || []);
          services = fallbackServices;
          fallbackCount = services.length;
          logger.info("BEMP_FALLBACK_SUCCESS", "Fallback recuperou serviços", { 
            salonId, 
            traceId, 
            count: fallbackCount 
          });
        }
      } catch (fallbackErr: any) {
        logger.error("BEMP_FALLBACK_CRITICAL_FAILED", fallbackErr.message, { salonId, traceId });
      }
    }

    // OBSERVABILITY
    logger.info("BEMP_LOOKUP_COMPLETED", "Processo de consulta BEMP finalizado", {
      unitId: String(salonId),
      traceId,
      primaryStatus,
      primaryBodyLength,
      primaryTransportEmpty: transportEmpty,
      fallbackUsed,
      fallbackStatus,
      fallbackCount,
      finalCount: services.length
    });

    // If both failed or returned nothing diagnosticable
    if (services.length === 0 && (primaryStatus !== 200 || (fallbackUsed && fallbackStatus !== 200))) {
      throw new AppError({
        code: "BEMP_UNAVAILABLE",
        message: `Não foi possível obter o catálogo. Primary: ${primaryStatus}, Fallback: ${fallbackStatus}`,
        safeMessage: "O sistema de catálogo está temporariamente indisponível.",
        statusCode: 503
      });
    }

    return services;
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
    const traceId = Math.random().toString(36).substring(7);
    const cfg = await getBempConfig();
    let url = params.professionalId
      ? `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/professionals/${params.professionalId}/slots/${params.date}`
      : `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/slots/${params.date}`;
    
    // 1. PRIMARY ATTEMPT
    let slots: any[] = [];
    let primarySuccess = false;
    let primaryStatus = 0;
    let transportEmpty = false;

    try {
      const result = await this.fetchRaw(url, undefined, "bemp-slots");
      primaryStatus = result.status;
      transportEmpty = result.transportEmpty;
      
      if (!transportEmpty && result.data) {
        slots = Array.isArray(result.data) ? result.data : (result.data?.data || []);
        primarySuccess = true;
      }
    } catch (err: any) {
      primaryStatus = err.statusCode || err.status || 500;
      logger.error("BEMP_SLOTS_PRIMARY_FAILED", err.message, { ...params, traceId, status: primaryStatus });
    }

    // 2. FALLBACK ATTEMPT
    const shouldTryFallback = !primarySuccess || transportEmpty;
    let fallbackUsed = false;
    let fallbackStatus = 0;

    if (shouldTryFallback) {
      fallbackUsed = true;
      try {
        const origin = process.env.VITE_APP_URL || 'http://localhost:8080';
        const relayUrl = `${origin}/api/public/bemp-services-relay`;
        
        logger.info("BEMP_SLOTS_FALLBACK_START", "Iniciando fallback de slots", { ...params, traceId });
        
        // O relay precisa ser atualizado para suportar slots ou passamos a URL completa
        const res = await fetch(relayUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Bemp-Relay-Secret': process.env.BEMP_RELAY_SECRET || '' 
          },
          body: JSON.stringify({ unitId: params.salonId, path: url.replace(cfg.apiBase, '') })
        });

        fallbackStatus = res.status;
        const text = await res.text();

        if (res.ok && text) {
          const result = JSON.parse(text);
          slots = Array.isArray(result) ? result : (result?.data || []);
          logger.info("BEMP_SLOTS_FALLBACK_SUCCESS", "Fallback de slots recuperado", { ...params, traceId, count: slots.length });
        }
      } catch (fallbackErr: any) {
        logger.error("BEMP_SLOTS_FALLBACK_CRITICAL_FAILED", fallbackErr.message, { ...params, traceId });
      }
    }

    if (slots.length === 0 && (primaryStatus !== 200 || (fallbackUsed && fallbackStatus !== 200))) {
      throw new AppError({
        code: "BEMP_UNAVAILABLE",
        message: `Não foi possível obter horários. Primary: ${primaryStatus}, Fallback: ${fallbackStatus}`,
        safeMessage: "Não conseguimos consultar a agenda neste momento.",
        statusCode: 503
      });
    }

    return slots;
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
    const result = await this.fetch<any>(`${cfg.apiBase}/customers/${customerId}/subscriptions`, undefined, "bemp-customer-subscriptions");
    return Array.isArray(result) ? result : (result?.data || []);
  }

  static async listCustomerAppointments(params: {
    phone_country_code: string;
    phone_area_code: string;
    phone_number: string;
  }): Promise<any[]> {
    // Tentar múltiplas variações de telefone para máxima resiliência
    const variations = [
      { cc: params.phone_country_code, ac: params.phone_area_code, n: params.phone_number },
      { cc: params.phone_country_code, ac: params.phone_area_code, n: params.phone_number.slice(-8) },
      { cc: params.phone_country_code, ac: params.phone_area_code, n: params.phone_number.replace(/^9/, "") },
      { cc: params.phone_country_code, ac: "0" + params.phone_area_code, n: params.phone_number },
      { cc: "55", ac: params.phone_area_code, n: params.phone_number },
    ];

    console.log(`[bemp-search] Início da busca resiliente para: ${params.phone_country_code}${params.phone_area_code}${params.phone_number}`);

    for (const v of variations) {
      try {
        const url = `${BEMP_WEBHOOK_BASE}/whatsapp_schedule?phone_country_code=${v.cc}&phone_area_code=${v.ac}&phone_number=${v.n}`;
        const result = await this.fetch<any>(url, { method: "GET" }, `bemp-appointments-${v.cc}-${v.ac}-${v.n}`);
        const data = Array.isArray(result) ? result : (result?.data || []);
        
        if (data.length > 0) {
          console.log(`[bemp-search] SUCESSO com a variação: ${v.cc}-${v.ac}-${v.n}`);
          return data;
        }
      } catch (err) {
        // Silenciosamente continua para a próxima variação
        continue;
      }
    }

    // Fallback Final: Busca por nome no catálogo (opcional se habilitado)
    console.log(`[bemp-search] Falha total em todas as variações de telefone.`);
    return [];
  }

  static async cancelAppointment(params: {
    appointmentId: string | number;
    phone_country_code: string;
    phone_area_code: string;
    phone_number: string;
  }): Promise<any> {
    const qs = new URLSearchParams({
      phone_country_code: params.phone_country_code,
      phone_area_code: params.phone_area_code,
      phone_number: params.phone_number,
      id: String(params.appointmentId),
    });
    return this.fetch<any>(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule?${qs.toString()}`, {
      method: "DELETE",
    }, "bemp-cancel-appointment");
  }

  static async createAppointment(input: any): Promise<any> {
    const payload = withProfessionalPreferenceNote(input);
    const data = await this.fetch<any>(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    }, "bemp-create-appointment");

    if (input.professional_id != null) {
      await tryUpdateBempScheduleNote(data, PROFESSIONAL_PREFERENCE_NOTE);
    }

    // Persistência local (através do logger por enquanto para provar o ID)
    const appointmentId = extractBempAppointmentId(data);
    logger.info("CREATE_BOOKING_RESULT", "Agendamento criado na BEMP", { 
      appointmentId,
      customerName: input.customer_name,
      serviceId: input.service_id,
      professionalId: input.professional_id,
      start: input.start
    });

    return data;
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
        const name = normalizeServiceSearchText(s?.name || s?.service_name || s?.title || "");
        const cat = normalizeServiceSearchText(s?.category || s?.group || "");
        const desc = normalizeServiceSearchText(s?.description || "");
        const tags = Array.isArray(s?.tags) ? s.tags.map((t: any) => normalizeServiceSearchText(String(t))) : [];

        if (normalizedQuery && name === normalizedQuery) return true;
        if (cat === normalizeServiceSearchText(params.category)) return true;
        if (params.category === "MECHAS" && name.includes("mecha")) return true;
        if (aliases.some(alias => name.includes(normalizeServiceSearchText(alias)))) return true;
        if (aliases.some(alias => desc.includes(normalizeServiceSearchText(alias)))) return true;
        if (tags.some((tag: string) => aliases.some(alias => tag.includes(normalizeServiceSearchText(alias))))) return true;

        return false;
      });

      const sortedMatches = matches.sort((a: any, b: any) => {
        const nameA = normalizeServiceSearchText(a?.name || "");
        const nameB = normalizeServiceSearchText(b?.name || "");
        
        const priorityA = (nameA.includes("mecha") || nameA.includes("pacote de mechas")) ? 0 : 1;
        const priorityB = (nameB.includes("mecha") || nameB.includes("pacote de mechas")) ? 0 : 1;

        if (priorityA !== priorityB) return priorityA - priorityB;
        return nameA.localeCompare(nameB);
      });

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
          active: true
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




