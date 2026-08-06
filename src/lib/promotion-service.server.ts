import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "./core-service";
import { BempService } from "./bemp-service.server";
import { normalizeServiceSearchText } from "./service-utils";

export interface Promotion {
  id: string;
  code: string;
  title: string;
  service_category: string;
  service_name: string;
  promotional_price: number;
  unit_id?: string;
  end_at: string;
}

export class PromotionService {
  static async getActivePromotions(params: {
    unitId?: string;
    channel: string;
    category?: string;
  }): Promise<Promotion[]> {
    const traceId = Math.random().toString(36).substring(7);
    
    try {
      // Usamos any para evitar erros de tipo até o gerador de tipos rodar
      let query = (supabaseAdmin
        .from('promotions' as any)
        .select('*') as any)
        .eq('status', 'ACTIVE')
        .contains('channels', [params.channel])
        .lte('start_at', new Date().toISOString())
        .gte('end_at', new Date().toISOString());

      if (params.category) {
        query = query.eq('service_category', params.category);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtra por unidade (global ou específica)
      return (data || []).filter((p: any) => !p.unit_id || p.unit_id === params.unitId) as Promotion[];
    } catch (error) {
      logger.error("PromotionService", "promotion_lookup_failed", error instanceof Error ? error.message : "Erro desconhecido", { error, ...params, traceId });
      return [];
    }
  }

  static async resolvePromotionService(promotion: Promotion, effectiveUnitId: string): Promise<any | null> {
    const traceId = Math.random().toString(36).substring(7);
    
    try {
      const result = await BempService.listServices(effectiveUnitId);
      if (!result) return null;

      const normalizedTarget = normalizeServiceSearchText(promotion.service_name);
      
      // Busca exata ou por termo contido
      const match = result.find((s: any) => {
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
    } catch (error) {
      logger.error("PromotionService", "promotion_service_resolution_failed", error instanceof Error ? error.message : "Erro desconhecido", { error, traceId });
      return null;
    }
  }
}
