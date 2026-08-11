import { processMessagesUpsert } from "../lib/evolution/processor.server";
import { supabaseAdmin } from "../integrations/supabase/client.server";

async function main() {
  const instance = "agente-5541998430354"; // Unidade 1377
  const phone = "5541999999999"; 
  const messageId = "TEST_FLOW_" + Date.now();
  
  console.log("--- TESTE REAL INBOUND SIMULADO ---");
  console.log("Instância:", instance);
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
          pushName: "Fabio Teste",
          message: {
            conversation: "Olá teste instancia"
          },
          messageTimestamp: Math.floor(Date.now() / 1000)
        }
      ]
    }
  };

  try {
    await processMessagesUpsert(payload, "http://localhost:8080/api/public/whatsapp");
    console.log("\nProcessamento concluído. Verificando logs...");
    
    // Aguardar um pouco para os logs assíncronos
    await new Promise(r => setTimeout(r, 5000));

    const { data: logs, error } = await supabaseAdmin
      .from("wa_audit_logs")
      .select("event, status, payload")
      .eq("message_id", messageId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    console.log("\nCHECKPOINTS ALCANÇADOS:");
    logs?.forEach(log => {
      console.log(`[${log.event}] - ${log.status}`);
      if (log.status === 'error' || log.event === 'OUTBOUND_INSTANCE_NOT_RESOLVED' || log.event === 'INSTANCE_MISMATCH_BLOCKED') {
          console.log("Payload:", JSON.stringify(log.payload, null, 2));
      }
    });

  } catch (err) {
    console.error("ERRO NO TESTE:", err);
  }
}

main();
