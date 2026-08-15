import { supabase } from "../../../integrations/supabase/client";

async function diagnoseBoulevardLeak() {
  console.log("==================================================");
  console.log("DIAGNÓSTICO FORENSE: CASO REAL BOULEVARD");
  console.log("==================================================");

  const instanceId = 'agente-554130731358';
  
  console.log(`\nBuscando logs reais para: ${instanceId}...`);
  
  // O erro anterior indica que algo está tentando acessar created_at mesmo com a query timestamp
  // Talvez o client esteja configurado com um default order?
  // Vamos tentar sem order explícito primeiro para ver se funciona
  
  const { data: logs, error: logsError } = await supabase
    .from('evo_trace_logs')
    .select('id, trace_id, instance_id, step, status, timestamp, payload')
    .eq('instance_id', instanceId)
    .limit(200);

  if (logsError) {
    console.error("Erro ao buscar logs:", logsError);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log("Nenhum log real encontrado para a instância Boulevard.");
  } else {
    // Sort manual no JS
    logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`Encontrados ${logs.length} registros de trace.`);
    
    const leaks = logs.filter((l: any) => 
        JSON.stringify(l.payload).includes('Ventura') || 
        JSON.stringify(l.payload).includes('1377')
    );

    if (leaks.length > 0) {
        console.log(`\n!!! EVIDÊNCIA DE VAZAMENTO ENCONTRADA !!!`);
        leaks.forEach((leak: any) => {
            console.log(`\n--- Registro ---`);
            console.log(`Timestamp: ${leak.timestamp}`);
            console.log(`Step: ${leak.step}`);
            console.log(`Trace ID: ${leak.trace_id}`);
            console.log(`Payload snippet: ${JSON.stringify(leak.payload).substring(0, 500)}`);
        });
    } else {
        console.log("\nNenhum vazamento explícito de 'Ventura' ou '1377' encontrado nos logs do Boulevard.");
        console.log("\nMostrando últimos 3 registros para conferência:");
        logs.slice(0, 3).forEach((l: any) => {
          console.log(`- [${l.timestamp}] Step: ${l.step} | Status: ${l.status}`);
        });
    }
  }
}

diagnoseBoulevardLeak();
