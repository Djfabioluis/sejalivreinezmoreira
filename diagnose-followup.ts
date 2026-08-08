
import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { getConnectionState, getQrCode } from "./src/lib/evolution.server";

async function main() {
  console.log("--- DIAGNÓSTICO DE CONECTIVIDADE ---");
  const instance = "agente-5541998430354"; // Tentando a instância anterior
  
  try {
    const state = await getConnectionState(instance);
    console.log(`Instância: ${instance}`);
    console.log(`Status: ${state}`);
    
    if (state !== 'conectado') {
      const qr = await getQrCode(instance);
      console.log("QR Code disponível:", qr ? "Sim (Base64 gerado)" : "Não");
    }
  } catch (err: any) {
    console.error("Erro ao verificar Evolution:", err.message);
  }

  console.log("\n--- BUSCA DE JOBS REALISTAS ---");
  const { data: jobs, error } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .in("status", ["READY", "PENDING", "PENDENTE", "READY_TO_SEND", "PROCESSING"])
    .not("reason", "eq", "MANUAL_TEST")
    .not("stage", "eq", "TEST_EXECUTION")
    .order("scheduled_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar jobs:", error.message);
  } else {
    console.log(`Jobs pendentes/stuck encontrados: ${jobs?.length || 0}`);
    jobs?.forEach(j => {
      console.log(`- ID: ${j.id} | Status: ${j.status} | Phone: ${j.phone} | Scheduled: ${j.scheduled_at} | Attempts: ${j.attempts}`);
    });
  }
}

main();
