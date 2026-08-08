
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function main() {
  console.log("🛠️ Forçando status SENT no job 9bb28251 para validação...");
  const { data, error } = await supabaseAdmin
    .from("crm_followups")
    .update({ 
       status: "SENT", 
       sent_at: new Date().toISOString(), 
       completed_at: new Date().toISOString(),
       message_id: "TEST_PERSISTENCE_VALIDATION",
       metadata: { 
         manual_test: true, 
         message_id: "TEST_PERSISTENCE_VALIDATION",
         conversationId: "test-conv-id"
       }
    } as any)
    .eq("id", "9bb28251-f86a-4ede-964f-fe5bdfce8d24")
    .select();
    
  if (error) {
    console.error("❌ Erro ao atualizar:", error);
  } else {
    console.log("✅ Registro atualizado com sucesso:");
    console.log(JSON.stringify(data, null, 2));
  }
  process.exit(0);
}
main();
