
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function main() {
  const myPhone = "551198430354"; // Substitua pelo seu número real se necessário
  
  console.log(`Criando job REAL para o número: ${myPhone}`);
  
  const { data, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: myPhone,
      customer_id: null,
      stage: "ABANDONED_BOOKING",
      reason: "NO_RESPONSE",
      priority: 1,
      scheduled_at: new Date().toISOString(),
      status: "READY",
      attempts: 0,
      metadata: {
        source: "REAL_TEST_V10",
        contact_name: "Usuario Real Teste",
        instance: "julia-main"
      }
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar job:", error.message);
  } else {
    console.log("Job criado com sucesso:", data.id);
    console.log("Aguarde o processamento pelo cron ou dispare manualmente pelo painel.");
  }
}

main();
