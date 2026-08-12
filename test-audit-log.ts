import { supabaseAdmin } from './src/integrations/supabase/client.server';

async function main() {
  const referral_phone = '41999529624';
  const referral_message = 'Esse procedimento é realizado pela clínica responsável parceira da nossa unidade. 💜 Para informações e agendamento sobre harmonização de bumbum ou barriga, você pode falar diretamente pelo número (41) 99952-9624.';
  const referral_intent = 'harmonizacao_bumbum_barriga';
  const boulevard_unit_id = '1378';

  const entry = {
    event: 'BOULEVARD_HARMONIZATION_REFERRAL',
    instance: 'agente-554130731358',
    message_id: 'SYSTEM_AUDIT',
    status: 'success',
    payload: {
      referral_phone,
      referral_intent,
      unit_id: boulevard_unit_id,
      description: 'Audit log entry for Boulevard referral rule'
    }
  };

  const { error } = await supabaseAdmin.from('evo_webhook_logs').insert(entry);
  if (error) {
    console.error('Error inserting audit log:', error);
    process.exit(1);
  }
  console.log('Audit log entry created successfully');
}

main();
