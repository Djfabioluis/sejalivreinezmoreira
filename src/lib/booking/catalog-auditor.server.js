/**
 * CATALOG_ONLY MODE - Strict Validator
 * Garante que a resposta da IA NUNCA contenha serviços fora do catálogo real.
 * Transforma o sanitizer em um bloqueador determinístico.
 */
export function validateOutputAgainstCatalog(text, allowedServices, bookingContext) {
    if (!text)
        return { text, blocked: false, hallucinatedServices: [] };
    const hallucinatedServices = [];
    // Normalizar allowedServices para comparação
    const validNames = allowedServices.map(s => s.name.toLowerCase().trim());
    const validIds = allowedServices.map(s => String(s.id));
    // 1. Extrair potenciais nomes de serviços da resposta (usualmente em listas numeradas ou aspas)
    // O Gemini costuma listar como "1. Nome do Serviço" ou "Gostaria de fazer o serviço X?"
    const lines = text.split('\n');
    for (const line of lines) {
        // Tentar identificar se a linha parece estar oferecendo um serviço
        // Padrão: "1. Manicure", "- Esmaltação", "Opção: Alongamento"
        const listMatch = line.match(/^\s*(?:\d+[.)]|-|[*])\s*(.+)$/);
        if (listMatch) {
            const candidateName = listMatch[1].trim().toLowerCase();
            // Verificação de correspondência (nome exato ou contido)
            const isAllowed = (validNames || []).some(vn => candidateName === vn ||
                (vn && vn.includes(candidateName)) ||
                (candidateName.length > 5 && vn && vn.includes(candidateName)));
            if (!isAllowed) {
                hallucinatedServices.push(listMatch[1].trim());
            }
        }
    }
    // 2. Verificação de segurança adicional para termos conhecidos de alucinação (blacklist fallback)
    const commonHallucinations = [
        "unhas de gel", "banho de gel", "blindagem", "manicure simples",
        "pé simples", "mão simples", "francesinha", "alongamento"
    ];
    for (const h of commonHallucinations) {
        if (text.toLowerCase().includes(h)) {
            const exists = (validNames || []).some(vn => vn && (vn.includes(h) || h.includes(vn)));
            if (!exists) {
                if (!hallucinatedServices.includes(h))
                    hallucinatedServices.push(h);
            }
        }
    }
    if (hallucinatedServices.length > 0) {
        console.error(`[CATALOG_VALIDATION_FAILED] Alucinações detectadas: ${hallucinatedServices.join(', ')}`);
        // Gerar resposta segura contendo APENAS o que é permitido
        let safeResponse = "Olá! Para te ajudar a agendar, selecione uma das opções reais do nosso catálogo:\n\n";
        allowedServices.forEach((s, i) => {
            const price = typeof s.price === 'number' ? s.price : parseFloat(String(s.price || 0));
            safeResponse += `${i + 1}. ${s.name}${!isNaN(price) && price > 0 ? ` (R$ ${price.toFixed(2).replace('.', ',')})` : ''}\n`;
        });
        safeResponse += "\nQual dessas opções você deseja? 💜";
        return {
            text: safeResponse,
            blocked: true,
            hallucinatedServices
        };
    }
    return { text, blocked: false, hallucinatedServices: [] };
}
/** Legacy support - wraps the new validator */
export function sanitizeCatalogOnlyResponse(text, services, bookingContext) {
    const result = validateOutputAgainstCatalog(text, services, bookingContext);
    return { text: result.text, hallucinated: result.blocked };
}
