import { supabaseAdmin } from './src/lib/integrations/supabase/client.server';

async function fix() {
  console.log("Corrigindo wa_agentes...");
  
  const agents = [
    { instancia: 'agente-554130731358', unidade_id: '1378' }, // Boulevard
    { instancia: 'agente-5541998430354', unidade_id: '1377' }, // Centro
    { instancia: 'agente-5541998803684', unidade_id: '5258' }  // Ventura
  ];

  for (const a of agents) {
    const { error } = await supabaseAdmin
      .from('wa_agentes')
      .update({ unidade_id: a.unidade_id })
      .eq('instancia', a.instancia);
    
    if (error) console.error(`Erro ao atualizar agente ${a.instancia}: `, error);
    else console.log(`Agente ${a.instancia} atualizado para ${a.unidade_id}`);
  }

  console.log("\nCorrigindo wa_conversas...");
  for (const a of agents) {
    const { error } = await supabaseAdmin
      .from('wa_conversas')
      .update({ unidade_id: a.unidade_id })
      .eq('instance', a.instancia);
    
    if (error) console.error(`Erro ao atualizar conversas da instância ${a.instancia}: `, error);
    else console.log(`Conversas da instância ${a.instancia} atualizadas para ${a.unidade_id}`);
  }
}

fix().catch(console.error);
