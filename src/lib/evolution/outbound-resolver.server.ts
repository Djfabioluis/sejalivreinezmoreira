import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logger } from "../observability/logger.server";

export interface OutboundInstance {
  unitId: string;
  agentId: string;
  instanceId: string;
  instanceName: string;
  phoneNumber: string | null;
}

/**
 * RESOLVE_OUTBOUND_INSTANCE_FOR_UNIT
 * Garantia determinística: UNIDADE -> AGENTE -> INSTÂNCIA EVOLUTION
 */
export async function resolveOutboundInstanceForUnit(unitId: string | number): Promise<OutboundInstance | null> {
  const unitIdStr = String(unitId);
  
  const { data: agent, error } = await supabaseAdmin
    .from("wa_agentes")
    .select("id, instancia, telefone, nome, unidade_id")
    .eq("unidade_id", unitIdStr)
    .eq("status_conexao", "conectado")
    .order("last_connection_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !agent) {
    logger.error("OUTBOUND_INSTANCE_NOT_RESOLVED", `Não foi possível resolver instância para a unidade ${unitIdStr}`, {
      unitId: unitIdStr,
      error: error?.message
    });
    return null;
  }

  const result: OutboundInstance = {
    unitId: unitIdStr,
    agentId: agent.id,
    instanceId: agent.instancia, // Na tabela wa_agentes, 'instancia' é o ID/Nome único usado na Evolution
    instanceName: agent.instancia,
    phoneNumber: agent.telefone
  };

  logger.info("OUTBOUND_INSTANCE_RESOLVED", `Instância resolvida para a unidade ${unitIdStr}`, {
    ...result,
    agentName: agent.nome
  });

  return result;
}

/**
 * Valida se a instância de saída corresponde à unidade da conversa.
 */
export async function validateOutboundInstance(params: {
  incomingInstance: string;
  outboundInstance: string;
  unitId: string | null;
  conversationId?: string;
}) {
  const { incomingInstance, outboundInstance, unitId, conversationId } = params;

  if (incomingInstance !== outboundInstance) {
    // Se mudou a instância mas a unidade é a mesma, há um risco de misturar números
    // No entanto, se houve troca explícita de unidade, a instância DEVE mudar.
    // O critério real é: a outboundInstance deve ser a que pertence à unidade ativa.
    
    if (unitId) {
      const resolved = await resolveOutboundInstanceForUnit(unitId);
      if (resolved && resolved.instanceId !== outboundInstance) {
        logger.error("INSTANCE_MISMATCH_BLOCKED", `Bloqueio de envio: instância de saída (${outboundInstance}) não pertence à unidade (${unitId})`, {
          incomingInstance,
          outboundInstance,
          unitId,
          conversationId,
          expectedInstance: resolved.instanceId
        });
        return { valid: false, reason: "INSTANCE_UNIT_MISMATCH", expected: resolved.instanceId };
      }
    }
  }

  return { valid: true };
}
