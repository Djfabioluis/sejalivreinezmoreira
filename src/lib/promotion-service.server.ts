import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "@/lib/observability/logger.server";
import { BempService } from "./bemp-service.server";
import { normalizeServiceSearchText } from "./service-utils";
import { z } from "zod";

export const PromotionSchema = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  service_category: z.string(),
  service_name: z.string(),
  promotional_price: z.coerce.number(),
  unit_id: z.string().nullable().optional(),
  start_at: z.string(),
  end_at: z.string(),
  status: z.string(),
  channels: z.array(z.string()),
  priority: z.number().nullable().optional()
});

export type Promotion = z.infer<typeof PromotionSchema>;

export type PromotionLookupResult =
  | {
      success: true;
      promotions: Promotion[];
    }
  | {
      success: false;
      code:
        | "PROMOTIONS_TABLE_NOT_FOUND"
        | "PROMOTION_QUERY_FAILED"
        | "PROMOTION_INVALID_DATA";
      message: string;
    };

export class PromotionService {
  static async getActivePromotions(params: {
    unitId?: string;
    channel: string;
    category?: string;
  }): Promise<PromotionLookupResult> {
    const traceId = Math.random().toString(36).substring(7);
    const now = new Date().toISOString();
    
    logger.info("PROMOTION_LOOKUP_STARTED", `Iniciando consulta de promoções [${traceId}]`, { 
      params, 
      now 
    });

    try {
      if (!supabaseAdmin) {
         logger.error("PROMOTION_QUERY_FAILED", "Supabase Admin não inicializado", { traceId });
         return {
           success: false,
           code: "PROMOTION_QUERY_FAILED",
           message: "Serviço de banco de dados indisponível."
         };
      }

      const query = (supabaseAdmin
        .from('promotions' as any)
        .select(`
          id,
          code,
          title,
          service_category,
          service_name,
          promotional_price,
          unit_id,
          start_at,
          end_at,
          status,
          channels,
          priority
        `) as any)
        .eq('status', 'ACTIVE')
        .contains('channels', [params.channel])
        .lte('start_at', now)
        .gte('end_at', now);

      if (params.category) {
        query.eq('service_category', params.category);
      }

      const { data, error } = await query;

      logger.audit("PROMOTION_SQL_EXECUTED", "SQL de consulta de promoções executado", {
        traceId,
        params,
        query_table: 'promotions',
        query_filters: { status: 'ACTIVE', channel: params.channel, now },
        result_count: data?.length || 0
      });

      if (error) {
        logger.error("promotion_query_failed", error.message, { error, params, traceId });
        return {
          success: false,
          code: error.code === "42P01" ? "PROMOTIONS_TABLE_NOT_FOUND" : "PROMOTION_QUERY_FAILED",
          message: error.message
        };
      }

      const parsedPromotions: Promotion[] = [];
      for (const item of (data || [])) {
        const validation = PromotionSchema.safeParse(item);
        if (validation.success) {
          if (!validation.data.unit_id || validation.data.unit_id === params.unitId) {
            parsedPromotions.push(validation.data);
          }
        } else {
          logger.warn("promotion_invalid_data", `Falha ao validar promoção [${traceId}]`, { error: validation.error, item });
          return {
            success: false,
            code: "PROMOTION_INVALID_DATA",
            message: "Dados da promoção inválidos no banco."
          };
        }
      }

      logger.info("PROMOTION_LOOKUP_COMPLETED", `Consulta concluída com ${parsedPromotions.length} promoções válidas [${traceId}]`, { 
        promotion_codes: parsedPromotions.map(p => p.code)
      });

      return {
        success: true,
        promotions: parsedPromotions
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro desconhecido";
      logger.error("promotion_lookup_exception", message, { error, params, traceId });
      return {
        success: false,
        code: "PROMOTION_QUERY_FAILED",
        message
      };
    }
  }

  static async resolvePromotionService(promotion: Promotion, effectiveUnitId: string): Promise<any | null> {
    const traceId = Math.random().toString(36).substring(7);
    
    try {
      const result = await BempService.listServices(effectiveUnitId);
      if (!result) return null;

      const normalizedTarget = normalizeServiceSearchText(promotion.service_name);
      
      const match = result.find((s: any) => {
        const name = normalizeServiceSearchText(s.name || s.service_name || "");
        return name === normalizedTarget || name.includes(normalizedTarget);
      });

      if (match) {
        logger.info("promotion_service_resolved", `Serviço da promoção resolvido [${traceId}]`, { 
          promotionCode: promotion.code, 
          serviceId: match.id 
        });
        return match;
      }

      return null;
    } catch (error) {
      logger.error("promotion_service_resolution_failed", error instanceof Error ? error.message : "Erro desconhecido", { error, traceId });
      return null;
    }
  }
}
