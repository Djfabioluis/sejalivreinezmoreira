// src/lib/booking/price-auditor.server.ts
import { PerformanceTrace } from "../evolution/performance.server";

export interface ResolvedPriceContext {
  serviceId: string;
  serviceName: string;
  price: number;
  unitId: string;
  source: string;
}

/**
 * Singleton temporário por request para capturar o preço resolvido durante a execução das ferramentas do Gemini.
 */
class PriceRegistry {
  private registry = new Map<string, ResolvedPriceContext>();

  set(traceId: string, context: ResolvedPriceContext) {
    this.registry.set(traceId, context);
  }

  get(traceId: string): ResolvedPriceContext | undefined {
    return this.registry.get(traceId);
  }

  clear(traceId: string) {
    this.registry.delete(traceId);
  }
}

export const priceAuditor = new PriceRegistry();
