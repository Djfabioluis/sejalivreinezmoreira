import { sanitizeCustomerText } from "./text-sanitize";

export async function testFormatting() {
  const input = "Linha 1\n\nLinha 2\n\nLinha 3\n\n*Negrito*\n\n• Item A\n• Item B";
  const output = sanitizeCustomerText(input);
  
  const inputBreaks = (input.match(/\n/g) || []).length;
  const outputBreaks = (output.match(/\n/g) || []).length;
  
  const hasBold = output.includes("*Negrito*");
  const hasBullet = output.includes("•");

  return {
    success: inputBreaks === outputBreaks && hasBold && hasBullet,
    inputBreaks,
    outputBreaks,
    output
  };
}
