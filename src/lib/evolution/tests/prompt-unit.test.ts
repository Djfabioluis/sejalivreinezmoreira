import { describe, it, expect } from "vitest";
import {
  replacePromptVariables,
  MANDATORY_SYSTEM_RULES,
  assembleSystemPrompt,
} from "@/lib/chat.server";

const DB_PROMPT = `Você é a Julia.
Nome: {{contactName}} / Telefone: {{contactPhone}} / Unidade: {{unitName}}
Estado: {{customer_context_summary}}
FLUXO IDEAL:
1. Cumprimente e pergunte o nome.
2. Peça telefone.
3. Liste unidades usando list_salons e pergunte qual escolhe.
Repetir {{contactName}} no final.`;

const opts = {
  unidadeId: "123",
  unitName: "Centro Cívico",
  contactName: "Fábio Luís",
  contactPhone: "5541999999999",
};

describe("prompt com unidade fixa", () => {
  it("substitui todas as ocorrências dos marcadores", () => {
    const out = replacePromptVariables(DB_PROMPT, {
      contactName: opts.contactName,
      contactPhone: opts.contactPhone,
      unitName: opts.unitName,
      customer_context_summary: "sem dados",
    });
    expect(out).not.toContain("{{");
    expect(out.match(/Fábio Luís/g)?.length).toBe(2);
  });

  it("acrescenta regras obrigatórias depois do prompt do banco", () => {
    const full = assembleSystemPrompt({ ...opts, customer_context: { summary: "sem dados" } });
    expect(full).toContain("REGRAS OBRIGATÓRIAS DO SISTEMA");
    expect(full).toContain("PROIBIDO perguntar ou sugerir a troca de unidade");
    expect(full).toContain("PROIBIDO pedir telefone");
    expect(full).toContain("PROIBIDO perguntar o nome");
    expect(full).toContain("Centro Cívico");
  });

  it("usa rótulo por ID quando o nome da unidade não está disponível", () => {
    const out = assembleSystemPrompt({
      ...opts,
      unitName: "Unidade vinculada ID 123",
      customer_context: { summary: "sem dados" },
    });
    expect(out).toContain("Unidade vinculada ID 123");
  });
});
