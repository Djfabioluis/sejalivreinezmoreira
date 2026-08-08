/**
 * Centralize common generic names that should be rejected in customer name resolution.
 */
export const GENERIC_NAMES = [
  "usuario", "usuário", "user", "cliente", "contato", "lead", 
  "desconhecido", "sem nome", "visitante", "whatsapp", "sem_nome",
  "null", "undefined", "nan", "voce", "você", "n/a", "unknown"
];

/**
 * Validates if a string is a real customer name.
 * 
 * Rules:
 * 1. Normalize spaces
 * 2. Reject empty/too short strings
 * 3. Reject purely numeric strings (phone numbers)
 * 4. Reject placeholders and common generic names
 * 5. Reject system keywords (null, undefined, etc)
 */
export function isValidCustomerName(name: string | null | undefined): boolean {
  if (!name) return false;
  
  // 1. Normalize and clean
  let cleanName = name.trim().replace(/[\t\r\n]/g, " ");
  
  // 2. Length check
  if (cleanName.length < 2) return false;
  
  // 3. Phone number check (if it's just digits, it's not a name)
  const digitsOnly = cleanName.replace(/\D/g, "");
  if (digitsOnly.length > 5 && digitsOnly === cleanName.replace(/[\s\+\-\(\)]/g, "")) {
    return false;
  }
  
  // 4. Generic names check
  const lowerName = cleanName.toLowerCase();
  if (GENERIC_NAMES.some(generic => lowerName === generic || lowerName.includes(` ${generic} `))) {
    return false;
  }
  
  // Special case: Exact match for common generics
  if (GENERIC_NAMES.includes(lowerName)) {
    return false;
  }
  
  // 5. Placeholder check (e.g. {{nome}}, [NOME])
  if (/^\{\{.*\}\}$/.test(cleanName) || /^\[.*\]$/.test(cleanName)) {
    return false;
  }

  
  // 6. Character validity (should have at least some letters)
  if (!/[a-zA-ZáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]/.test(cleanName)) {
    return false;
  }

  return true;
}

/**
 * Normalizes a name for display.
 */
export function formatCustomerName(name: string): string {
  return name.trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
