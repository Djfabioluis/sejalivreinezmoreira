import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { processAutomatedRecoveries } from "./recovery.server";
import { processBirthdays } from "./birthday.server";

/**
 * Script de teste para validar os novos motores de CRM.
 */
export async function testCrmEngines() {
  console.log("--- TESTE CRM ENGINES ---");
  
  const testPhone = "5541999999999";
  
  // 1. Simular Abandono Genérico
  console.log("1. Testando Abandono Genérico...");
  await supabaseAdmin.from("crm_customer_pipeline").upsert({
    phone: testPhone,
    current_stage: "ABANDONADO",
    abandonment_reason: "Sem resposta após escolher serviço",
    last_interaction_at: new Date().toISOString(),
    customer_name: "Teste Abandono"
  });
  
  await processAutomatedRecoveries();
  
  // 2. Simular Aniversariante
  console.log("2. Testando Aniversariante...");
  const today = new Date();
  const birthDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/1990`;
  
  await supabaseAdmin.from("wa_conversas").upsert({
    phone: testPhone,
    instance: "agente-5541998430354",
    phone_number: testPhone,
    contact_name: "Teste Aniversario",
    customer_context: { birth_date: birthDate }
  });
  
  await processBirthdays();
  
  // 3. Verificar crm_followups
  const { data: followups } = await supabaseAdmin
    .from("crm_followups")
    .select("*")
    .eq("phone", testPhone)
    .order("created_at", { ascending: false });
    
  console.log("Follow-ups criados:", followups?.length);
  console.log(JSON.stringify(followups, null, 2));
  
  return { success: true, followups };
}
