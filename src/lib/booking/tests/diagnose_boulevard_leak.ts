import { supabase } from "@/integrations/supabase/client";

async function diagnoseBoulevardLeak() {
  console.log("==================================================");
  console.log("DIAGNÓSTICO FORENSE: CASO REAL BOULEVARD");
  console.log("==================================================");

  const instanceId = 'agente-554130731358';
  
  console.log(`\nBuscando logs reais para: ${instanceId}...`);
  
  const { data: logs, error: logsError } = await supabase
    .from('evo_trace_logs')
    .select('*')
    .eq('instance_id', instanceId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (logsError) {
    console.error("Erro ao buscar logs:", logsError);
    return;
  }

  if (!logs || logs.length === 0) {
    console.log("Nenhum log real encontrado para a instância Boulevard.");
  } else {
    console.log(`Encontrados ${logs.length} registros de trace.`);
    
    const leaks = logs.filter((l: any) => 
        JSON.stringify(l.payload).includes('Ventura') || 
        JSON.stringify(l.payload).includes('1377') ||
        (l.context && JSON.stringify(l.context).includes('Ventura')) ||
        (l.context && JSON.stringify(l.context).includes('1377'))
    );

    if (leaks.length > 0) {
        console.log(`\n!!! EVIDÊNCIA DE VAZAMENTO ENCONTRADA !!!`);
        leaks.forEach((leak: any) => {
            console.log(`\n--- Registro ---`);
            console.log(`Timestamp: ${leak.created_at}`);
            console.log(`Step: ${leak.step}`);
            console.log(`Trace ID: ${leak.trace_id}`);
            console.log(`Payload snippet: ${JSON.stringify(leak.payload).substring(0, 500)}`);
        });
    } else {
        console.log("\nNenhum vazamento explícito de 'Ventura' ou '1377' encontrado nos logs do Boulevard.");
    }
  }
}

diagnoseBoulevardLeak();
