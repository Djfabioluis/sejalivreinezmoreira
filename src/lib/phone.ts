/**
 * Utilitário central para normalização de telefones brasileiros.
 * Usado tanto pelo Follow-up quanto pela Evolution para garantir consistência.
 */
export interface NormalizedPhone {
  countryCode: string;
  areaCode: string;
  number: string;
  full: string;
  reason?: string;
}

export function normalizeBrazilianPhone(input: string): NormalizedPhone | null {
  if (!input) return null;

  // Remove tudo que não for dígito
  const digits = input.replace(/\D/g, "");

  let countryCode = "55";
  let areaCode = "";
  let number = "";

  // 1. Extração de componentes baseado no tamanho
  if (digits.length === 13 && digits.startsWith("55")) {
    areaCode = digits.slice(2, 4);
    number = digits.slice(4);
  } else if (digits.length === 12 && digits.startsWith("55")) {
    areaCode = digits.slice(2, 4);
    number = digits.slice(4);
  } else if (digits.length === 11) {
    areaCode = digits.slice(0, 2);
    number = digits.slice(2);
  } else if (digits.length === 10) {
    areaCode = digits.slice(0, 2);
    number = digits.slice(2);
  } else if (digits.length === 9 && digits.startsWith("9")) {
    return { countryCode, areaCode: "", number: digits, full: digits, reason: "MISSING_AREA_CODE" };
  } else if (digits.length < 10) {
    return { countryCode, areaCode: "", number: digits, full: digits, reason: "INVALID_LENGTH_TOO_SHORT" };
  } else if (digits.length > 13) {
    return { countryCode, areaCode: "", number: digits, full: digits, reason: "INVALID_LENGTH_TOO_LONG" };
  }

  // 2. Validação de DDD (Brasil 11-99)
  const areaInt = parseInt(areaCode, 10);
  if (isNaN(areaInt) || areaInt < 11 || areaInt > 99) {
    return { countryCode, areaCode, number, full: digits, reason: "INVALID_AREA_CODE" };
  }

  // 3. Validação de Número (mínimo 8 dígitos)
  if (number.length < 8) {
    return { countryCode, areaCode, number, full: digits, reason: "INVALID_SUBSCRIBER_NUMBER" };
  }

  return {
    countryCode,
    areaCode,
    number,
    full: `${countryCode}${areaCode}${number}`
  };
}

export function maskPhone(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return `******${digits.slice(-4)}`;
}

/**
 * Gera variantes do telefone para lidar com o 9º dígito.
 */
export function getPhoneVariants(normalized: NormalizedPhone): NormalizedPhone[] {
  const variants = [normalized];
  const { countryCode, areaCode, number } = normalized;

  if (!areaCode || !number) return variants;

  // Se tem 9 dígitos e começa com 9, tenta a variante de 8
  if (number.length === 9 && number.startsWith("9")) {
    const withoutNine = number.slice(1);
    variants.push({
      countryCode,
      areaCode,
      number: withoutNine,
      full: `${countryCode}${areaCode}${withoutNine}`
    });
  } 
  // Se tem 8 dígitos, tenta a variante de 9 adicionando o 9 na frente
  else if (number.length === 8) {
    const withNine = `9${number}`;
    variants.push({
      countryCode,
      areaCode,
      number: withNine,
      full: `${countryCode}${areaCode}${withNine}`
    });
  }

  return variants;
}
