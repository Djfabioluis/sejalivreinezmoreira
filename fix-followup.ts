import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function fixStuckRecord() {
  console.log("Resetando registro preso...");
  const { data, error } = await supabaseAdmin
    .from("crm_followups")
    .update({ 
      status: 'READY', 
      scheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString() 
    })
    .eq('id', 'b10e737a-b358-4bed-9d9c-165498916d6f');
  
  if (error) {
    console.error("Erro ao resetar:", error);
  } else {
    console.log("Registro resetado com sucesso!");
  }
}

fixStuckRecord();
