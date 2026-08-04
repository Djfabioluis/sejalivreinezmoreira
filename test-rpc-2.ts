
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testRPC() {
  const params = {
    p_phone: "agente-5541998803684:5511999999999",
    p_message: { id: "test-rpc-" + Date.now(), role: "user", parts: [{ type: "text", text: "Teste de RPC via Script - CORRIGIDO" }] },
    p_instance: "agente-5541998803684",
    p_phone_number: "5511999999999",
    p_contact_name: "Teste Script",
    p_increment_unread: true,
    p_new_status: "aberta",
    p_customer_context: null
  };

  console.log("Chamando append_wa_message com:", JSON.stringify(params, null, 2));
  
  const { data, error } = await supabaseAdmin.rpc("append_wa_message", params);

  if (error) {
    console.error("Erro na RPC:", JSON.stringify(error, null, 2));
  } else {
    console.log("Sucesso na RPC:", JSON.stringify(data, null, 2));
  }
}

testRPC();
