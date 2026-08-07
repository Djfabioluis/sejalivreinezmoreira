/**
 * Utilitário para normalização de telefones brasileiros.
 */
export interface NormalizedPhone {
  countryCode: string;
  areaCode: string;
  number: string;
  full: string;
}

export function normalizeBrazilianPhone(input: string): NormalizedPhone | null {
  // Remove tudo que não for dígito
  const digits = input.replace(/\D/g, "");

  // Formatos aceitos:
  // 11 dígitos: 55 41 999999999 (com DDI 55) -> total 13
  // 10 dígitos: 55 41 88888888 (com DDI 55) -> total 12
  // 11 dígitos: 41 999999999 -> total 11
  // 10 dígitos: 41 88888888 -> total 10

  let countryCode = "55";
  let areaCode = "";
  let number = "";

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
  } else if (digits.length === 9) {
    // Presume-se que o usuário esqueceu o DDD, mas informou o 9
    return null; 
  } else if (digits.length === 8) {
    // Fixo ou antigo sem DDD
    return null;
  } else {
    return null;
  }

  // Validação básica de DDD (Brasil 11-99)
  const areaInt = parseInt(areaCode, 10);
  if (isNaN(areaInt) || areaInt < 11 || areaInt > 99) return null;

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
