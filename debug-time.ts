import { supabaseAdmin } from "./src/integrations/supabase/client.server";

async function checkTime() {
  const { data: dbNow } = await (supabaseAdmin as any).rpc("execute_sql", { sql: "SELECT now() as n" });
  console.log("Database Now:", dbNow?.[0]?.n);
  console.log("Server Now:  ", new Date().toISOString());
}
checkTime();
