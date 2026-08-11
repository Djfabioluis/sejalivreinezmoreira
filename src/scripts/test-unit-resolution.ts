import { supabaseAdmin } from "../integrations/supabase/client.server";

async function main() {
  const { data: agents, error } = await supabaseAdmin
    .from("wa_agentes")
    .select("id, nome, instancia, unidade_id, status_conexao, telefone");

  if (error) {
    console.error("Erro ao buscar agentes:", error);
    return;
  }

  console.log("MAPEAR AGENTES:");
  agents?.forEach(agent => {
    console.log(`- Instância: ${agent.instancia} | Unidade: ${agent.unidade_id} | Status: ${agent.status_conexao} | Telefone: ${agent.telefone}`);
  });
}

main();
