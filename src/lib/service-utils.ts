
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
