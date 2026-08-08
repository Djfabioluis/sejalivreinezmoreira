import { isValidCustomerName, formatCustomerName } from "../customer-name-validator";

function test(name: any) {
  const valid = isValidCustomerName(name);
  const formatted = valid ? formatCustomerName(name) : null;
  console.log(`Input: [${name}] | Valid: ${valid} | Result: [${formatted}]`);
}

console.log("--- Customer Name Validation Tests ---");
test("Fabio");
test("fabio oliveira");
test("Usuario");
test("cliente");
test("5541999102791");
test("{{nome}}");
test(null);
test("undefined");
test("Sem Nome");
test("Visitante");
test("WhatsApp");
test("Você");
test("Voce");
test("  Fabio  ");
test("A");
test("A1");
test("Joao!");
