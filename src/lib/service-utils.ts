
/**
 * Normaliza o texto para busca de serviços.
 * Remove acentos, pontuação, espaços extras e converte para lowercase.
 */
export function normalizeServiceSearchText(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") // Remove pontuação
    .replace(/\s+/g, " ") // Normaliza espaços
    .trim();
}

/**
 * Aliases para categorias de serviço, centralizados.
 */
export const SERVICE_CATEGORY_ALIASES = {
  MECHAS: [
    "mecha",
    "mechas",
    "pacote mecha",
    "pacote mechas",
    "pacote de mecha",
    "pacote de mechas",
    "luzes",
    "reflexo",
    "reflexos",
    "iluminacao",
    "morena iluminada",
    "loiro iluminado",
    "retoque de mechas",
    "retoque mechas",
    "contorno iluminado",
    "balayage",
    "ombre hair"
  ]
} as const;

export type ServiceCategory = keyof typeof SERVICE_CATEGORY_ALIASES;

/**
 * Configuração central de promoções.
 */
export const PROMOTIONS = {
  PACOTE_MECHAS: {
    enabled: true,
    price: 289.90,
    title: "Pacote de Mechas",
    startDate: "2026-08-01",
    endDate: "2026-08-31",
    priority: 1
  }
} as const;

/**
 * Verifica se uma promoção está ativa.
 */
export function isPromotionActive(promotionKey: keyof typeof PROMOTIONS): boolean {
  const promo = PROMOTIONS[promotionKey];
  if (!promo.enabled) return false;
  
  const now = new Date();
  const start = new Date(promo.startDate);
  const end = new Date(promo.endDate);
  
  return now >= start && now <= end;
}

