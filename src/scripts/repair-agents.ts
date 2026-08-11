import { supabaseAdmin } from "../integrations/supabase/client.server";

async function repair() {
  console.log("--- REPARANDO AGENTES ---");
  const { error } = await supabaseAdmin
    .from("wa_agentes")
    .update({ status_conexao: "conectado" } as any)
    .eq("status", "ativo");
    
  if (error) {
    console.error("Erro ao reparar agentes:", error);
  } else {
    console.log("Agentes reparados com sucesso (status_conexao = conectado).");
  }
}

repair().catch(console.error);
