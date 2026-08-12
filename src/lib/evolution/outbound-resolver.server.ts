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

  // VALIDAR INSTÂNCIA ANTES DO ENVIO
  const validation = await checkInstanceStatus(result.instanceName);
  
  logger.info("FOLLOWUP_INSTANCE_VALIDATION", `Validação de instância para unidade ${unitIdStr}`, {
    ...result,
    ...validation
  });

  if (!validation.exists) {
     logger.error("EVOLUTION_INSTANCE_NOT_FOUND", `Instância ${result.instanceName} não encontrada na Evolution`, { unitId: unitIdStr });
     return null;
  }

  if (!validation.connected) {
     logger.warn("EVOLUTION_INSTANCE_DISCONNECTED", `Instância ${result.instanceName} está desconectada`, { unitId: unitIdStr });
     // Opcional: retornar null se quiser fail-closed rigoroso
  }

  return result;
}

/**
 * Consulta a Evolution API para verificar o status real da instância
 */
export async function checkInstanceStatus(instanceName: string): Promise<{ exists: boolean; connected: boolean; state?: string }> {
  try {
    const { getConnectionState } = await import("../evolution.server");
    const state = await getConnectionState(instanceName);
    
    // CORREÇÃO: Diferenciar status reais da Evolution
    // getConnectionState retorna "desconectado" apenas quando a Evolution confirma ou em erro genérico.
    // Se o estado for retornado pela API, a instância existe.
    const exists = !!state && state !== "desconectado";
    const connected = state === "conectado";

    return {
      exists,
      connected,
      state
    };
  } catch (err) {
    logger.error("EVOLUTION_STATUS_CHECK_FAILED", `Erro ao checar status da instância ${instanceName}`, { error: err.message });
    return { exists: false, connected: false };
  }
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
