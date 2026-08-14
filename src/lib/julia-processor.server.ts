import { type UIMessage, generateText, tool } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { assembleSystemPrompt, resolveEffectiveUnit, runTool, patchCustomerContext } from "./chat.server";
import { BempService } from "./bemp-service.server";
import { replyWithAI } from "./evolution/reply.server";
import { PerformanceTrace } from "./evolution/performance.server";
import { logger } from "@/lib/observability/logger.server";
import { type BookingContext } from "@/lib/booking/context";

export async function processJuliaMessage(params: {
  instanceId: string;
  phone: string;
  text: string;
  conversationKey: string;
  contactName?: string;
  bookingContext: BookingContext;
  history: any[];
  agentUnitId?: string | null;
}) {
  const { instanceId, phone, text, conversationKey, bookingContext, history, agentUnitId, contactName } = params;
  
  const traceId = `julia-${Date.now()}`;
  const trace = new PerformanceTrace({
    traceId,
    instanceId,
    conversationId: conversationKey
  });

  const { effectiveUnitId, effectiveUnitName } = await resolveEffectiveUnit({
    conversationKey,
    agentUnitId
  });

  let resolvedPriceContext: any = null;

  const systemPrompt = assembleSystemPrompt({
    contactName,
    contactPhone: phone,
    unitName: effectiveUnitName,
    traceId,
    bookingContext,
    customer_context: { bookingContext }
  });

  const provider = createLovableAiGatewayProvider();
  
  const result = await generateText({
    model: provider("google/gemini-2.0-flash"),
    system: systemPrompt,
    messages: history,
    tools: {
      list_services: tool({
        description: "Lista serviços de uma unidade. Use para obter o catálogo real e PREÇOS OFICIAIS.",
        inputSchema: z.object({ salon_id: z.string().optional() }),
        execute: async ({ salon_id }) => {
          return runTool("list_services", async () => {
            const unitId = salon_id || effectiveUnitId;
            if (!unitId) throw new Error("Unidade não identificada.");
            
            trace.record("SERVICE_SEARCH", { text, instanceId, unitId });
            const services = await BempService.listServices(unitId);
            
            // Lógica de busca semântica/por termo no catálogo real
            const searchTerms = text.toLowerCase().split(/\s+/);
            const candidates = services.filter((s: any) => 
               searchTerms.some(term => term.length > 2 && s.name.toLowerCase().includes(term))
            );

            if (candidates.length > 0) {
              const best = candidates[0]; // Simplificação: pega o primeiro match
              resolvedPriceContext = {
                serviceId: String(best.id),
                serviceName: best.name,
                price: parseFloat(best.price),
                unitId: unitId,
                source: "BEMP/list_services"
              };
              trace.record("SERVICE_PRICE_RESOLVED", resolvedPriceContext);
              
              // Patch no contexto para persistência
              await patchCustomerContext(conversationKey, {
                "bookingContext.serviceId": String(best.id),
                "bookingContext.serviceName": best.name
              });
            }

            return services;
          }, { conversationKey, effectiveUnitId });
        }
      }),
      // Outras ferramentas omitidas para brevidade, mas devem existir no original
    },
    maxSteps: 5,
  });

  // Enviar resposta com a proteção de preço
  await replyWithAI({
    instance: instanceId,
    phone,
    text: result.text,
    conversationKey,
    unitId: effectiveUnitId,
    resolvedPrice: resolvedPriceContext,
    _trace: trace
  }, traceId);

  return result;
}
