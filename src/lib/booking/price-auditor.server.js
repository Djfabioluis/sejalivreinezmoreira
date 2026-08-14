/**
 * Singleton temporário por request para capturar o preço resolvido durante a execução das ferramentas do Gemini.
 */
class PriceRegistry {
    registry = new Map();
    set(traceId, context) {
        this.registry.set(traceId, context);
    }
    get(traceId) {
        return this.registry.get(traceId);
    }
    clear(traceId) {
        this.registry.delete(traceId);
    }
}
export const priceAuditor = new PriceRegistry();
