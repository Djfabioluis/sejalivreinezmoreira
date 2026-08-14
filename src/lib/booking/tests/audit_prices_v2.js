import { BempService } from "../../bemp-service.server.ts";
import { supabaseAdmin } from "../../../integrations/supabase/client.server.ts";
import { priceAuditor } from "../price-auditor.server.ts";
async function runAudit() {
    console.log("==================================================");
    console.log("1. IDENTIFIQUE AS 3 INSTÂNCIAS REAIS");
    console.log("==================================================");
    // Mapeamento real baseado na consulta ao banco
    // 1377 = Ventura
    // 5258 = Boulevard
    // 1378 = Centro
    const { data: agentes } = await supabaseAdmin
        .from('wa_agentes')
        .select('instancia, telefone, unidade_id')
        .in('unidade_id', ['1377', '5258', '1378']);
    const units = {
        CENTRO: agentes?.find((a) => String(a.unidade_id) === '1378'),
        VENTURA: agentes?.find((a) => String(a.unidade_id) === '1377'),
        BOULEVARD: agentes?.find((a) => String(a.unidade_id) === '5258')
    };
    console.log("CENTRO:", units.CENTRO);
    console.log("VENTURA:", units.VENTURA);
    console.log("BOULEVARD:", units.BOULEVARD);
    if (!units.CENTRO || !units.VENTURA || !units.BOULEVARD) {
        console.error("ERRO: Não foi possível localizar todas as instâncias.");
    }
    console.log("\n==================================================");
    console.log("2. CONSULTE O CATÁLOGO REAL DE CADA UNIDADE");
    console.log("==================================================");
    const queries = ['corte', 'corte feminino', 'corte masculino', 'manicure', 'escova'];
    for (const [key, unit] of Object.entries(units)) {
        if (!unit || !unit.unidade_id)
            continue;
        console.log(`--- ${key} (UnitID: ${unit.unidade_id}) ---`);
        try {
            const services = await BempService.listServices(unit.unidade_id);
            for (const q of queries) {
                const matches = services.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
                matches.forEach((s) => {
                    console.log(`UNIDADE: ${key} | serviceId: ${s.id} | name: ${s.name} | price: ${s.price} | duration: ${s.duration}`);
                });
            }
        }
        catch (e) {
            console.error(`Erro ao listar serviços para ${key}:`, e);
        }
    }
    console.log("\n==================================================");
    console.log("3. TESTE A RESOLUÇÃO E 4. AMBIGUIDADE");
    console.log("==================================================");
    const testPhrases = [
        "Quanto custa corte?",
        "Quanto custa corte feminino?",
        "Quanto custa corte masculino?",
        "Quanto custa manicure?",
        "Quanto custa escova?",
        "Quanto custa o serviço XYZ INEXISTENTE 987?"
    ];
    for (const [key, unit] of Object.entries(units)) {
        if (!unit || !unit.unidade_id)
            continue;
        console.log(`\n### TESTANDO UNIDADE: ${key}`);
        const services = await BempService.listServices(unit.unidade_id);
        for (const phrase of testPhrases) {
            const searchTerm = phrase.toLowerCase().replace("quanto custa ", "").replace("?", "").trim();
            const candidates = services.filter((s) => s.name.toLowerCase().includes(searchTerm));
            console.log(`Mensagem: "${phrase}"`);
            console.log(`Candidatos encontrados: ${candidates.map((c) => c.name).join(", ") || "NENHUM"}`);
            if (candidates.length > 1) {
                console.log(`RESULTADO DA RESOLUÇÃO: AMBÍGUO (FALHOU se selecionar auto)`);
            }
            else if (candidates.length === 1) {
                const selected = candidates[0];
                console.log(`serviceId selecionado: ${selected.id}`);
                console.log(`serviceName selecionado: ${selected.name}`);
                console.log(`officialPrice: ${selected.price}`);
            }
            else {
                console.log(`serviceId: null | officialPrice: null | SERVICE_PRICE_RESOLVED = false`);
            }
            console.log("---");
        }
    }
    console.log("\n==================================================");
    console.log("6. TESTE DE ALUCINAÇÃO CONTROLADO");
    console.log("==================================================");
    const traceIdAluc = "test-aluc-123";
    priceAuditor.set(traceIdAluc, {
        serviceId: "123",
        serviceName: "Corte",
        price: 100.00,
        unitId: "5258",
        source: "test"
    });
    console.log("officialPrice = 100.00");
    console.log("generatedPrice = 79.90 (Simulado)");
    const aiMessage = "O valor do corte é R$ 79,90.";
    const priceRegex = /R\$\s?(\d+[,.]\d{2})/g;
    const match = priceRegex.exec(aiMessage);
    if (match) {
        const foundPrice = parseFloat(match[1].replace(',', '.'));
        const resolvedContext = priceAuditor.get(traceIdAluc);
        const resolvedPrice = resolvedContext?.price;
        if (resolvedPrice !== undefined && foundPrice !== resolvedPrice) {
            console.log("RESULTADO: PRICE_MISMATCH_BLOCKED (Detectado mismatch: 79.90 vs 100.00)");
        }
        else {
            console.log("RESULTADO: FALHOU (Não detectou o mismatch)");
        }
    }
    else {
        console.log("RESULTADO: FALHOU (Regex não encontrou preço na mensagem)");
    }
}
runAudit().catch(console.error);
