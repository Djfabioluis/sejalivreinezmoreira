import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "@/lib/permissions.functions";

export type ReagendamentoHist = {
  id: string;
  old_appointment_id: string | null;
  new_appointment_id: string | null;
  salon_id: string | null;
  service_id: string | null;
  service_name: string | null;
  professional_id: string | null;
  old_start: string | null;
  new_start: string;
  phone: string;
  name: string | null;
  status: string;
  warning: string | null;
  message_text: string | null;
  message_sent: boolean;
  message_sent_at: string | null;
  sandbox: boolean;
  created_at: string;
};

export const listReagendamentos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReagendamentoHist[]> => {
    await assertPermission(context, "painel");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("reagendamentos_hist" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as ReagendamentoHist[];
  });
