import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function test() {
  const phone = "5541999102791";
  
  console.log("1. Setup...");
  await supabaseAdmin.from("wa_conversas").delete().eq("phone", phone);
  await supabaseAdmin.from("wa_conversas").insert({ 
    phone, 
    instance: "test",
    attendance_mode: "HUMAN"
  });

  console.log("2. Update...");
  const { error } = await supabaseAdmin
    .from("wa_conversas")
    .update({ attendance_mode: "AI" })
    .eq("phone", phone);

  if (error) {
    console.error("Update error:", error);
  }

  console.log("3. Verify...");
  const { data } = await supabaseAdmin.from("wa_conversas").select("attendance_mode").eq("phone", phone).single();
  console.log("Result:", data?.attendance_mode);
}

test();
