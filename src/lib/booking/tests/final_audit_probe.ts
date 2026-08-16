
import { getEvolutionConfig, findMessages } from '../../evolution.server';

async function run() {
  console.log("--- 1. CONFIGURAÇÃO REAL VENTURA (5258) ---");
  try {
    const config = await getEvolutionConfig('5258');
    console.log('EVOLUTION_WEBHOOK_URL =', config.webhookUrl);
    console.log('WEBHOOK_ENABLED =', config.webhookEnabled);
    console.log('MESSAGES_UPSERT_SUBSCRIBED =', config.events?.includes('MESSAGES_UPSERT'));
  } catch (e: any) { console.error("Erro Ventura:", e.message); }

  console.log("\n--- 7. EVOLUTION (PROVA DE MENSAGEM 5258) ---");
  try {
    const msgs = await findMessages('5258', { limit: 20 });
    const target = msgs.find((m: any) => {
      const text = (m.message?.conversation || m.message?.extendedTextMessage?.text || "").toLowerCase();
      return text.includes('mão');
    });
    if (target) {
      console.log('MESSAGE_PRESENT_IN_EVOLUTION = SIM');
      console.log('MESSAGE_ID =', target.key.id);
    } else {
      console.log('MESSAGE_PRESENT_IN_EVOLUTION = NÃO ENCONTRADA');
    }
  } catch (e: any) { console.error("Erro History:", e.message); }

  console.log("\n--- 8. TRÊS INSTÂNCIAS ---");
  try {
    const c = await getEvolutionConfig('1377');
    const v = await getEvolutionConfig('5258');
    const b = await getEvolutionConfig('1378');
    console.log('CENTRO_WEBHOOK_URL =', c.webhookUrl);
    console.log('VENTURA_WEBHOOK_URL =', v.webhookUrl);
    console.log('BOULEVARD_WEBHOOK_URL =', b.webhookUrl);
  } catch (e: any) { console.error("Erro Configs:", e.message); }
}
run();
