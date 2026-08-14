import { bempFetch, getBempConfig, BEMP_WEBHOOK_BASE, PROFESSIONAL_PREFERENCE_NOTE, tryUpdateBempScheduleNote, withProfessionalPreferenceNote, extractBempAppointmentId } from "./bemp.server";
export { extractBempAppointmentId };
import { logger } from "./observability/logger.server";
import { AppError } from "./core/errors";
import { normalizeServiceSearchText, SERVICE_CATEGORY_ALIASES } from "./service-utils";
/**
 * BempService: Camada única para comunicação com a API BEMP.
 * Centraliza tratamento de erros, logs e padrões de dados.
 */
export class BempService {
    static async fetch(url, init, module = "bemp-service") {
        const startedAt = Date.now();
        logger.debug("BEMP_REQUEST_START", `${init?.method || "GET"} ${url}`, { module });
        try {
            const data = await bempFetch(url, init);
            const durationMs = Date.now() - startedAt;
            logger.info("BEMP_REQUEST_SUCCESS", `${init?.method || "GET"} ${url}`, { durationMs, module });
            return data;
        }
        catch (error) {
            const durationMs = Date.now() - startedAt;
            logger.error("BEMP_REQUEST_FAILED", error.message, {
                url,
                method: init?.method,
                durationMs,
                module,
                status: error.status
            });
            let code = "BEMP_UNAVAILABLE";
            if (error.status === 404)
                code = "NOT_FOUND";
            if (error.status === 401)
                code = "UNAUTHORIZED";
            if (error.status === 429)
                code = "RATE_LIMITED";
            throw new AppError({
                code: code,
                message: error.message || "Erro de comunicação com a API BEMP.",
                safeMessage: "Não foi possível sincronizar com o sistema de agenda (BEMP).",
                statusCode: error.status || 500,
                cause: error
            });
        }
    }
    static async listSalons() {
        const cfg = await getBempConfig();
        const result = await this.fetch(`${cfg.apiBase}/salons`, undefined, "bemp-salons");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async listServices(salonId) {
        const cfg = await getBempConfig();
        const result = await this.fetch(`${cfg.apiBase}/salons/${salonId}/services`, undefined, "bemp-services");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async listProfessionals(salonId, serviceId) {
        const cfg = await getBempConfig();
        const result = await this.fetch(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/professionals`, undefined, "bemp-professionals");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async listAvailableSlots(params) {
        const cfg = await getBempConfig();
        let url = params.professionalId
            ? `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/professionals/${params.professionalId}/slots/${params.date}`
            : `${cfg.apiBase}/salons/${params.salonId}/services/${params.serviceId}/slots/${params.date}`;
        const result = await this.fetch(url, undefined, "bemp-slots");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async findCustomerByPhone(params) {
        const cfg = await getBempConfig();
        const qs = new URLSearchParams({
            phone_country_code: params.countryCode,
            phone_area_code: params.areaCode,
            phone_number: params.number,
        });
        return this.fetch(`${cfg.apiBase}/whatsapp_customer?${qs.toString()}`, undefined, "bemp-find-customer");
    }
    static async listCustomerSubscriptions(customerId) {
        const cfg = await getBempConfig();
        const result = await this.fetch(`${cfg.apiBase}/customers/${customerId}/subscriptions`, undefined, "bemp-customer-subscriptions");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async listCustomerAppointments(params) {
        const result = await this.fetch(`${BEMP_WEBHOOK_BASE}/whatsapp_appointments`, {
            method: "POST",
            body: JSON.stringify(params),
        }, "bemp-customer-appointments");
        return Array.isArray(result) ? result : (result?.data || []);
    }
    static async createAppointment(input) {
        const payload = withProfessionalPreferenceNote(input);
        const data = await this.fetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(payload),
        }, "bemp-create-appointment");
        if (input.professional_id != null) {
            await tryUpdateBempScheduleNote(data, PROFESSIONAL_PREFERENCE_NOTE);
        }
        return data;
    }
    static async searchServicesByCategory(params) {
        const traceId = Math.random().toString(36).substring(7);
        const logCtx = { traceId, unitId: params.effectiveUnitId, category: params.category, query: params.query };
        logger.info("service_category_search_started", "Iniciando busca de serviços por categoria", logCtx);
        try {
            const services = await this.listServices(params.effectiveUnitId);
            const aliases = SERVICE_CATEGORY_ALIASES[params.category] || [];
            const normalizedQuery = params.query ? normalizeServiceSearchText(params.query) : "";
            const matches = services.filter((s) => {
                const name = normalizeServiceSearchText(s?.name || s?.service_name || s?.title || "");
                const cat = normalizeServiceSearchText(s?.category || s?.group || "");
                const desc = normalizeServiceSearchText(s?.description || "");
                const tags = Array.isArray(s?.tags) ? s.tags.map((t) => normalizeServiceSearchText(String(t))) : [];
                if (normalizedQuery && name === normalizedQuery)
                    return true;
                if (cat === normalizeServiceSearchText(params.category))
                    return true;
                if (params.category === "MECHAS" && name.includes("mecha"))
                    return true;
                if (aliases.some(alias => name.includes(normalizeServiceSearchText(alias))))
                    return true;
                if (aliases.some(alias => desc.includes(normalizeServiceSearchText(alias))))
                    return true;
                if (tags.some((tag) => aliases.some(alias => tag.includes(normalizeServiceSearchText(alias)))))
                    return true;
                return false;
            });
            const sortedMatches = matches.sort((a, b) => {
                const nameA = normalizeServiceSearchText(a?.name || "");
                const nameB = normalizeServiceSearchText(b?.name || "");
                const priorityA = (nameA.includes("mecha") || nameA.includes("pacote de mechas")) ? 0 : 1;
                const priorityB = (nameB.includes("mecha") || nameB.includes("pacote de mechas")) ? 0 : 1;
                if (priorityA !== priorityB)
                    return priorityA - priorityB;
                return nameA.localeCompare(nameB);
            });
            const uniqueMatches = Array.from(new Map(sortedMatches.map((s) => [s.id, s])).values());
            logger.info("service_category_search_completed", "Busca de serviços concluída", { ...logCtx, resultsCount: uniqueMatches.length });
            return {
                success: true,
                data: uniqueMatches.map((s) => ({
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
        }
        catch (error) {
            logger.error("service_category_search_failed", error.message, logCtx);
            return {
                success: false,
                errorCode: error.code === "NOT_FOUND" ? "UNIT_NOT_FOUND" : "BEMP_UNAVAILABLE",
                error: error.message
            };
        }
    }
}
