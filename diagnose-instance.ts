import { getConnectionState, getEvolutionConfig, getQrCode } from "./src/lib/evolution.server";
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function main() {
  console.log("--- DIAGNÓSTICO DE INSTÂNCIA ---");
  
  // 1. Verificar base_conhecimento ID 20
  const { data: kb } = await supabaseAdmin
    .from("base_conhecimento" as any)
    .select("conteudo")
    .eq("id", 20)
    .maybeSingle();
  
  const config = kb ? JSON.parse(kb.conteudo) : null;
  console.log("Configuração ID 20:", config);

  // 2. Verificar instância usada pelo motor
  const defaultInstance = "agente-5541998430354";
  console.log("Instância padrão do motor:", defaultInstance);

  // 3. Checar status da conexão
  try {
    const state = await getConnectionState(defaultInstance);
    console.log(`Estado da conexão para [${defaultInstance}]:`, state);

    if (state !== "conectado") {
      console.log("Instância NÃO conectada. Gerando QR Code...");
      const qr = await getQrCode(defaultInstance);
      if (qr) {
        console.log("QR Code gerado com sucesso (Base64 disponível).");
        // Não logamos o base64 completo por ser grande, mas confirmamos presença.
      } else {
        console.log("Falha ao gerar QR Code.");
      }
    }
  } catch (err: any) {
    console.error("Erro ao checar status:", err.message);
  }

  // 4. Listar outras instâncias conhecidas no banco para referência
  const { data: conversations } = await supabaseAdmin
    .from("wa_conversas")
    .select("instance")
    .limit(100);
    
  const instances = Array.from(new Set(conversations?.map(c => c.instance) || []));
  console.log("Outras instâncias encontradas em wa_conversas:", instances);
}

main().catch(console.error);
