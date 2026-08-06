function listOrDash(list, max = 6) {
    if (!Array.isArray(list) || list.length === 0)
        return "não registrado";
    return list.slice(0, max).map((v) => String(v)).join(", ");
}
function objectOrDash(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return "não registrado";
    const entries = Object.entries(value).filter(([, v]) => v !== null && v !== "");
    if (entries.length === 0)
        return "não registrado";
    return entries.map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("; ");
}
/**
 * Bloco de MEMÓRIA CONFIRMADA injetado no prompt antes de chamar a IA.
 * Só entra no prompt o que já foi confirmado; inferências de baixa confiança
 * são apresentadas explicitamente como possibilidade.
 */
export function buildMemoryPromptBlock(memory) {
    if (!memory)
        return "";
    const lowConfidence = (memory.confidence_score ?? 0) < 0.4;
    const block = [
        "\n\nMEMÓRIA CONFIRMADA DO CLIENTE (histórico permanente — use para personalizar):",
        `- Nome preferido: ${memory.preferred_name || memory.contact_name || "não registrado"}`,
        `- Serviços frequentes: ${listOrDash(memory.preferred_services)}`,
        `- Profissionais preferidos: ${listOrDash(memory.preferred_professionals)}`,
        `- Dias preferidos: ${listOrDash(memory.preferred_days)}`,
        `- Horários preferidos: ${listOrDash(memory.preferred_times)}`,
        `- Plano ativo (última leitura): ${objectOrDash(memory.subscription_summary)}`,
        `- Restrições: ${listOrDash(memory.restrictions)}`,
        `- Pendências: ${listOrDash(memory.pending_topics)}`,
        `- Observações: ${listOrDash(memory.important_notes, 4)}`,
        `- Resumo: ${memory.memory_summary || "sem resumo"}`,
        `- Confiança média da memória: ${(memory.confidence_score ?? 0).toFixed(2)}`,
        "",
        "REGRAS DE USO DA MEMÓRIA (prioridade máxima):",
        "- Use a memória para personalizar o atendimento e evitar perguntas já respondidas.",
        "- Se o nome preferido estiver registrado, chame o cliente por ele sem perguntar novamente.",
        "- NÃO afirme que algo é preferência quando a confiança for baixa; nesse caso, pergunte gentilmente para confirmar.",
        "- Confirme informações antigas quando forem decisivas para um novo agendamento.",
        "- Dados atuais do BEMP prevalecem sobre a memória antiga (plano, saldo, serviços, profissionais).",
        "- A unidade atual da conversa (inclusive após transferência) prevalece sobre a unidade preferida do cliente.",
        "- NUNCA crie agendamento com base apenas na memória: sempre consulte disponibilidade real com as ferramentas.",
        "- Se o cliente pedir para mudar ou apagar uma informação, aceite naturalmente, confirme em uma frase curta e siga o atendimento.",
        "- Se o cliente pedir algo diferente da preferência salva, atenda o pedido atual e pergunte se deseja atualizar a preferência permanente.",
    ];
    if (lowConfidence) {
        block.push("- ATENÇÃO: a memória deste cliente tem confiança baixa. Trate os itens acima como possibilidades a confirmar, nunca como fatos.");
    }
    return block.join("\n");
}
