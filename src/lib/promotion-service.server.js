import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "./core-service";
import { BempService } from "./bemp-service.server";
import { normalizeServiceSearchText } from "./service-utils";
import { z } from "zod";
export const PromotionSchema = z.object({
    id: z.string(),
    code: z.string(),
    title: z.string(),
    service_category: z.string(),
    service_name: z.string(),
    promotional_price: z.coerce.number().positive(),
    unit_id: z.string().nullable().optional(),
    start_at: z.string(),
    end_at: z.string(),
    status: z.string(),
    channels: z.array(z.string())
});
export class PromotionService {
    static async getActivePromotions(params) {
        const traceId = Math.random().toString(36).substring(7);
        try {
            let query = supabaseAdmin
                .from('promotions')
                .select('*')
                .eq('status', 'ACTIVE')
                .contains('channels', [params.channel])
                .lte('start_at', new Date().toISOString())
                .gte('end_at', new Date().toISOString());
            if (params.category) {
                query = query.eq('service_category', params.category);
            }
            const { data, error } = await query;
            if (error) {
                logger.error("PromotionService", "promotion_query_failed", error.message, { error, ...params, traceId });
                return {
                    success: false,
                    code: error.code === "42P01" ? "PROMOTION_TABLE_NOT_FOUND" : "PROMOTION_QUERY_FAILED",
                    message: error.message,
                    retryable: true
                };
            }
            const parsedPromotions = [];
            for (const item of (data || [])) {
                const validation = PromotionSchema.safeParse(item);
                if (validation.success) {
                    // Filtra por unidade (global ou específica)
                    if (!validation.data.unit_id || validation.data.unit_id === params.unitId) {
                        parsedPromotions.push(validation.data);
                    }
                }
                else {
                    logger.warn("PromotionService", "promotion_invalid_data", "Falha ao validar promoção", { error: validation.error, item, traceId });
                }
            }
            return {
                success: true,
                promotions: parsedPromotions
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "Erro desconhecido";
            logger.error("PromotionService", "promotion_lookup_exception", message, { error, ...params, traceId });
            return {
                success: false,
                code: "PROMOTION_QUERY_FAILED",
                message,
                retryable: true
            };
        }
    }
    static async resolvePromotionService(promotion, effectiveUnitId) {
        const traceId = Math.random().toString(36).substring(7);
        try {
            const result = await BempService.listServices(effectiveUnitId);
            if (!result)
                return null;
            const normalizedTarget = normalizeServiceSearchText(promotion.service_name);
            const match = result.find((s) => {
                const name = normalizeServiceSearchText(s.name || s.service_name || "");
                return name === normalizedTarget || name.includes(normalizedTarget);
            });
            if (match) {
                logger.info("PromotionService", "promotion_service_resolved", undefined, {
                    traceId,
                    promotionCode: promotion.code,
                    serviceId: match.id
                });
                return match;
            }
            return null;
        }
        catch (error) {
            logger.error("PromotionService", "promotion_service_resolution_failed", error instanceof Error ? error.message : "Erro desconhecido", { error, traceId });
            return null;
        }
    }
}
