// Utilitários de CPF: normalização, validação e mascaramento (LGPD).
// Seguro para uso em servidor e cliente. NUNCA logue o CPF completo.

/** Remove pontos, traços e espaços, deixando somente dígitos. */
export function normalizeCPF(input: unknown): string {
  return String(input ?? "").replace(/\D+/g, "");
}

/** Valida os 11 dígitos e os dígitos verificadores do CPF. */
export function isValidCPF(input: unknown): boolean {
  const cpf = normalizeCPF(input);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number) as number[];
  for (const [len, pos] of [
    [9, 9],
    [10, 10],
  ] as const) {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += digits[i]! * (len + 1 - i);
    let check = (sum * 10) % 11;
    if (check === 10) check = 0;
    if (check !== digits[pos]!) return false;
  }
  return true;
}

/** Máscara para logs e persistência: ***.***.***-12 */
export function maskCPF(input: unknown): string {
  const cpf = normalizeCPF(input);
  if (cpf.length !== 11) return "***.***.***-**";
  return `***.***.***-${cpf.slice(9)}`;
}

/** Extrai um CPF de um texto livre (ex.: "meu cpf é 000.000.000-00"). */
export function extractCPFFromText(text: unknown): string | null {
  const raw = String(text ?? "");
  const matches = raw.match(/\d[\d.\-\s]{9,16}\d/g) ?? [];
  for (const m of matches) {
    const cpf = normalizeCPF(m);
    if (cpf.length === 11 && isValidCPF(cpf)) return cpf;
  }
  return null;
}
