
import { syncEvolutionInstances } from "./src/lib/agentes-whatsapp.functions";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function testSync() {
  console.log("--- INICIANDO TESTE DE SINCRONIZAÇÃO ---");
  
  // 1. Verificar agentes antes
  const { data: before } = await supabaseAdmin.from("wa_agentes").select("id, instancia, status_conexao");
  console.log(`Agentes antes da sincronização: ${before?.length || 0}`);
  
  try {
    // 2. Executar sincronização
    // Como o server function precisa de contexto de auth, e estamos rodando via script,
    // vamos tentar chamar o handler diretamente se possível ou simular o que ele faz.
    // Mas para este ambiente, o ideal é rodar o próprio server function.
    
    const result = await syncEvolutionInstances();
    console.log("Resultado da sincronização:", JSON.stringify(result, null, 2));
    
    // 3. Verificar agentes depois
    const { data: after } = await supabaseAdmin.from("wa_agentes").select("id, instancia, status_conexao");
    console.log(`Agentes depois da sincronização: ${after?.length || 0}`);
    
    if (result.success) {
      console.log("✅ Teste concluído com sucesso!");
    } else {
      console.log("❌ Teste falhou.");
    }
  } catch (err) {
    console.error("❌ Erro durante o teste:", err);
  }
}

testSync();
