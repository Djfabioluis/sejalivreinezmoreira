import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type RegraCrossSell = {
  id: string;
  salon_id: string | null;
  salon_nome: string | null;
  trigger_service_id: string;
  trigger_service_nome: string | null;
  suggested_service_id: string;
  suggested_service_nome: string | null;
  ordem: number;
  ativo: boolean;
  limite_por_servico_dia: number | null;
  limite_por_cliente_dia: number | null;
  limite_por_conversa: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type RegistroSugestao = {
  id: string;
  regra_id: string | null;
  salon_id: string | null;
  trigger_service_id: string | null;
  suggested_service_id: string;
  suggested_service_nome: string | null;
  phone: string | null;
  status: string;
  sandbox: boolean;
  observacao: string | null;
  created_at: string;
};

const RegraInput = z.object({
  salon_id: z.string().trim().optional().nullable(),
  salon_nome: z.string().trim().optional().nullable(),
  trigger_service_id: z.string().trim().min(1),
  trigger_service_nome: z.string().trim().optional().nullable(),
  suggested_service_id: z.string().trim().min(1),
  suggested_service_nome: z.string().trim().optional().nullable(),
  ordem: z.number().int().min(0).default(0),
  ativo: z.boolean().default(true),
  limite_por_servico_dia: z.number().int().min(0).optional().nullable(),
  limite_por_cliente_dia: z.number().int().min(0).optional().nullable(),
  limite_por_conversa: z.number().int().min(0).optional().nullable(),
  observacoes: z.string().trim().optional().nullable(),
});

function normalize(input: z.infer<typeof RegraInput>) {
  return {
    salon_id: input.salon_id?.trim() ? input.salon_id.trim() : null,
    salon_nome: input.salon_nome?.trim() ? input.salon_nome.trim() : null,
    trigger_service_id: input.trigger_service_id.trim(),
    trigger_service_nome: input.trigger_service_nome?.trim() || null,
    suggested_service_id: input.suggested_service_id.trim(),
    suggested_service_nome: input.suggested_service_nome?.trim() || null,
    ordem: input.ordem,
    ativo: input.ativo,
    limite_por_servico_dia:
      input.limite_por_servico_dia == null ? null : Number(input.limite_por_servico_dia),
    limite_por_cliente_dia:
      input.limite_por_cliente_dia == null ? null : Number(input.limite_por_cliente_dia),
    limite_por_conversa:
      input.limite_por_conversa == null ? null : Number(input.limite_por_conversa),
    observacoes: input.observacoes?.trim() || null,
  };
}

export const listRegrasCrossSell = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("sugestoes_cross_sell" as never)
    .select("*")
    .order("trigger_service_nome", { ascending: true })
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RegraCrossSell[];
});

export const createRegraCrossSell = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => RegraInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("sugestoes_cross_sell" as never)
      .insert(normalize(data) as never)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: (row as { id: string }).id };
  });

export const updateRegraCrossSell = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    RegraInput.extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { id, ...rest } = data;
    const { error } = await supabaseAdmin
      .from("sugestoes_cross_sell" as never)
      .update({
        ...normalize(rest),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRegraCrossSell = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("sugestoes_cross_sell" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listRegistrosSugestoes = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("sugestoes_registros" as never)
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as RegistroSugestao[];
});
