import { processMessagesUpsert } from "../lib/evolution/processor.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function main() {
  const instance = "agente-5541998430354"; // Unidade 1377
  const phone = "5541999999998"; // Novo número para evitar conflitos
  const messageId = "VALIDATION_" + Date.now();
  
  console.log("--- TESTE DE VALIDAÇÃO FINAL ---");
  console.log("Instância Inbound:", instance);
  console.log("Message ID:", messageId);

  const payload = {
    event: "messages.upsert",
    instance: instance,
    data: {
      messages: [
        {
          key: {
            remoteJid: `${phone}@s.whatsapp.net`,
            fromMe: false,
            id: messageId
          },
          pushName: "Fabio Validação",
          message: {
            conversation: "Olá Julia, teste final"
          },
          messageTimestamp: Math.floor(Date.now() / 1000)
        }
      ]
    }
  };

  try {
    await processMessagesUpsert(payload, "http://localhost:8080/api/public/whatsapp");
    console.log("\nProcessamento concluído. Verificando checkpoints...");
    
    // Aguardar o processamento assíncrono
    await new Promise(r => setTimeout(r, 6000));

    const { data: logs, error } = await supabaseAdmin
      .from("evo_webhook_logs" as any)
      .select("event, status, payload")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log("\nCHECKPOINTS:");
    let outboundForced = false;
    let messageSent = false;
    
    logs?.forEach(log => {
      const payloadObj = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
      console.log(`[${log.event}] - ${log.status}`);
      
      if (log.event === 'OUTBOUND_INSTANCE_FORCED_BY_INBOUND') {
          outboundForced = true;
          console.log("  -> REGRA VALIDADA: Instância de saída forçada para ser igual à de entrada.");
      }
      if (log.event === 'MESSAGE_SENT' && log.status === 'success') {
          messageSent = true;
          console.log("  -> SUCESSO: Mensagem enviada via Evolution API.");
          console.log("  -> Message ID:", payloadObj?.sentMessageId);
      }
    });

    if (outboundForced && messageSent) {
        console.log("\n✅ TESTE REAL APROVADO: Inbound -> Julia -> Outbound (Mesma instância)");
    } else {
        console.log("\n❌ TESTE FALHOU: Não foram detectados todos os critérios de sucesso.");
    }

  } catch (err) {
    console.error("ERRO NO TESTE:", err);
  }
}

main();
