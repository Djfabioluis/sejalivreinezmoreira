import { supabaseAdmin } from '../integrations/supabase/client.server';

async function audit() {
  console.log("--- AUDITORIA DE AGENTES (STATUS E INSTÂNCIA) ---");
  const { data: agents } = await supabaseAdmin.from('wa_agentes').select('*');
  console.table(agents?.map(a => ({ 
    id: a.id, 
    instancia: a.instancia, 
    status: a.status, 
    conexao: a.status_conexao,
    unidade: a.unidade_id 
  })));

  console.log("\n--- AUDITORIA DE CONVERSAS HUMANAS ---");
  const { data: humanConvs } = await supabaseAdmin
    .from('wa_conversas')
    .select('phone, attendance_mode, human_takeover_detected, ai_paused_at')
    .eq('attendance_mode', 'HUMAN');
  console.table(humanConvs);
}

audit().catch(console.error);
