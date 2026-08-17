import { resolveTechnicalInstance } from "./src/lib/evolution/instance-mapper.server";

function test(name: string) {
  console.log(`Input: "${name}" -> Output: "${resolveTechnicalInstance(name)}"`);
}

test("Ventura");
test("ventura");
test("agente-5541998803684");
test("Unknown");
