import { runAgent } from "@/lib/chat.server";
import { AIContext } from "./types";
import { logEvent } from "./logger.server";

export async function executeAI(context: AIContext) {
  // Diagnóstico estruturado (booleano/IDs mascarados)
  await logEvent({ 
    instance: context.instance, 
    event: "ai_context_prepared", 
    status: "success",
    payload: {
      contactNameAvailable: !!context.contactName,
      contactPhoneAvailable: !!context.contactPhone,
      agentUnitAvailable: !!context.unidadeId,
      historyMessageCount: context.history.length,
      customerContextLoaded: !!context.customerContext
    }
  });

  try {
    const aiResponse = await runAgent(context.history, { 
      sandbox: false,
      unidadeId: context.unidadeId,
      unitName: context.unitName,
      contactName: context.contactName,
      contactPhone: context.contactPhone,
      customerContext: context.customerContext || {}
    });

    if (aiResponse) {
      await logEvent({ 
        instance: context.instance, 
        event: "ai_flow", 
        status: "runAgent_finished" 
      });
    }

    return aiResponse;
  } catch (error: any) {
    await logEvent({ 
      instance: context.instance, 
      event: "ai_flow", 
      status: "error", 
      errorDetail: error.message 
    });
    throw error;
  }
}
