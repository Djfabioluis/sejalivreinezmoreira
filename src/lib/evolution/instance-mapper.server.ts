/**
 * Mapeamento de nomes amigáveis para IDs de instância Evolution reais.
 * Usado quando a Evolution envia o apelido da instância em vez do ID técnico.
 */
export const INSTANCE_NAME_MAP: Record<string, string> = {
  "Ventura": "agente-5541998803684",
  "ventura": "agente-5541998803684",
  "Boulevard": "agente-5541998430354",
  "boulevard": "agente-5541998430354",
  "Centro": "agente-554130731358",
  "centro": "agente-554130731358"
};

export function resolveTechnicalInstance(instance: string): string {
  return INSTANCE_NAME_MAP[instance] || instance;
}
