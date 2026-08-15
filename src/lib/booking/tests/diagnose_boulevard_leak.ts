import { supabase } from "../../integrations/supabase/client";

async function diagnoseBoulevardLeak() {
  console.log("==================================================");
  console.log("DIAGNÓSTICO FORENSE: CASO REAL BOULEVARD");
  console.log("==================================================");

  const instanceId = 'agente-554130731358';
  
  // 1. Localizar logs reais recentes da instância Boulevard
  console.log(`\nBuscando logs reais para: ${instanceId}...`);
  
  const { data: logs, error: logsError } = await supabase
    .from('evo_trace_logs')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (logsError) {
    console.error("Erro ao buscar logs:", logsError);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log("Nenhum log real encontrado para a instância Boulevard nos últimos registros.");
    // Tentar buscar na tabela de webhooks
    console.log("Buscando na evo_webhook_logs...");
    const { data: webhooks } = await supabase
        .from('evo_webhook_logs')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false })
        .limit(10);
    
    if (webhooks && webhooks.length > 0) {
        console.log(`Encontrados ${webhooks.length} webhooks recentes.`);
        webhooks.forEach(w => {
            console.log(`- [${w.created_at}] Evento: ${w.event} | Trace: ${w.trace_id}`);
        });
    } else {
        console.log("Nenhuma atividade real recente detectada para Boulevard.");
    }
  } else {
    console.log(`Encontrados ${logs.length} registros de trace.`);
    
    // Procurar por identificação incorreta (Ventura / 1377) nos logs do Boulevard
    const leaks = logs.filter(l => 
        JSON.stringify(l.payload).includes('Ventura') || 
        JSON.stringify(l.payload).includes('1377') ||
        JSON.stringify(l.context).includes('Ventura') ||
        JSON.stringify(l.context).includes('1377')
    );

    if (leaks.length > 0) {
        console.log(`\n!!! EVIDÊNCIA DE VAZAMENTO ENCONTRADA !!!`);
        console.log(`Foram encontrados ${leaks.length} registros onde a unidade correta (Boulevard) parece ter sido substituída por Ventura.`);
        
        const latestLeak = leaks[0];
        console.log("\nDETALHES DO ÚLTIMO VAZAMENTO:");
        console.log(`Timestamp: ${latestLeak.created_at}`);
        console.log(`Step: ${latestLeak.step}`);
        console.log(`Trace ID: ${latestLeak.trace_id}`);
        console.log("Payload:", JSON.stringify(latestLeak.payload, null, 2));
    } else {
        console.log("\nNenhum vazamento explícito de 'Ventura' ou '1377' encontrado nos campos de payload/context dos logs de trace do Boulevard.");
    }
  }

  // 2. Auditar fontes de identidade no código (Simulação de busca sem alteração)
  console.log("\n==================================================");
  console.log("AUDITORIA DE FONTES DE IDENTIDADE");
  console.log("==================================================");
  
  // Isso será feito via grep/rg nas próximas etapas
}

diagnoseBoulevardLeak();
