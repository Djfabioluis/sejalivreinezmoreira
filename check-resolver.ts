
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791"; 
  const instance = "agente-5541998430354";
  
  try {
    const { normalizeBrazilianPhone } = await import("./src/lib/phone");
    const normalizedPhone = normalizeBrazilianPhone(phone)?.full || phone.replace(/\D/g, '');
    
    console.log(`🔍 Testando busca para ${normalizedPhone} com preferência para ${instance}...`);
    
    const { resolveConversationForFollowup } = await import("./src/lib/crm/conversation-resolver.server");
    const res = await resolveConversationForFollowup(normalizedPhone, { instance });
    
    console.log("✅ RESULTADO BUSCA:");
    console.log(JSON.stringify(res, null, 2));
    
    if (res.instance === instance) {
      console.log("🎉 SUCESSO: A instância preferencial foi respeitada!");
    } else {
      console.log("⚠️ AVISO: A instância preferencial NÃO foi respeitada. Caiu em:", res.instance);
    }
    
  } catch (err) {
    console.error("💥 Erro no teste:", err);
  }
}

test();
