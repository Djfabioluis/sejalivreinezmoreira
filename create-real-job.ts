
import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function main() {
  console.log("📝 Criando job de validação real...");
  const { data: job, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: "5511988430354", 
      status: "READY",
      stage: "FINAL_VALIDATION",
      scheduled_at: new Date().toISOString(),
      metadata: { 
        test_run: true,
        contact_name: "Fabio Luis"
      }
    } as any)
    .select()
    .single();

  if (error) {
    console.error("❌ Erro ao criar job:", error);
    process.exit(1);
  }
  console.log("✅ Job de validação real criado:", (job as any).id);
  process.exit(0);
}
main().catch(err => {
  console.error(err);
  process.exit(1);
});
