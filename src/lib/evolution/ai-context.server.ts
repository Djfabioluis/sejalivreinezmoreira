import { runAgent } from "@/lib/chat.server";
import { AIContext } from "./types";
import { logEvent } from "./logger.server";

export async function executeAI(context: AIContext) {
  await logEvent({ 
    instance: context.instance, 
    event: "ai_flow", 
    status: "runAgent_started" 
  });

  try {
    const aiResponse = await runAgent(context.history, { 
      sandbox: false,
      unidadeId: context.unidadeId,
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
