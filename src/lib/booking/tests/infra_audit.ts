
import { getEvolutionConfig } from './src/lib/evolution.server.ts';

async function run() {
  console.log('--- DIAGNÓSTICO DE INFRAESTRUTURA ---');
  try {
    const config = await getEvolutionConfig();
    const headers = { apikey: config.apiKey };
    
    // 1 & 8. CONFIGURAÇÃO DAS INSTÂNCIAS
    const instances = ['agente-554130731358', 'agente-5541998803684', 'agente-5541996726203'];
    for (const name of instances) {
      const res = await fetch(`${config.url}/instance/fetchInstances?instanceName=${name}`, { headers });
      const data: any = await res.json();
      const inst = Array.isArray(data) ? data[0] : data;
      console.log(`${name}_WEBHOOK_URL =`, inst?.instance?.webhook?.url || inst?.webhook?.url || 'N/A');
      if (name === 'agente-5541998803684') {
        console.log('VENTURA_WEBHOOK_ENABLED =', inst?.instance?.webhook?.enabled || inst?.webhook?.enabled);
        const events = inst?.instance?.webhook?.events || inst?.webhook?.events || [];
        console.log('VENTURA_MESSAGES_UPSERT_SUBSCRIBED =', events.includes('MESSAGES_UPSERT'));
      }
    }

    // 7. PROVA DE MENSAGEM
    const resMsg = await fetch(`${config.url}/chat/findMessages/agente-5541998803684`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 20 })
    });
    const msgs: any = await resMsg.json();
    const record = Array.isArray(msgs) ? msgs : (msgs.record || []);
    const target = record.find((m: any) => {
      const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || '').toLowerCase();
      return text.includes('mão');
    });
    if (target) {
      console.log('\nMESSAGE_PRESENT_IN_EVOLUTION = SIM');
      console.log('MESSAGE_ID =', target.key.id);
      console.log('MESSAGE_TIMESTAMP =', new Date(target.messageTimestamp * 1000).toISOString());
    } else {
      console.log('\nMESSAGE_PRESENT_IN_EVOLUTION = NÃO ENCONTRADA');
    }

  } catch (e: any) {
    console.error('ERRO NO DIAGNÓSTICO:', e.message);
  }
}
run();
