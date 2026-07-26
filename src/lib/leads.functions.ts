import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type LeadAssinatura = {
  id: string;
  created_at: string;
  updated_at: string;
  status: string;
  origem: string;
  sandbox: boolean;
  plano_id: number | null;
  plano_nome: string | null;
  nome: string;
  email: string | null;
  cpf: string | null;
  phone_country_code: string | null;
  phone_area_code: string | null;
  phone_number: string | null;
  observacoes: string | null;
};

export const listLeadsAssinatura = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("leads_assinatura" as never)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadAssinatura[];
});

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["novo", "em_atendimento", "convertido", "descartado"]),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("leads_assinatura" as never)
      .update({ status: data.status, updated_at: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
