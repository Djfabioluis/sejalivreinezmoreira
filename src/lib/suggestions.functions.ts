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

export type AuditoriaConversa = {
  key: string;
  phone: string | null;
  data: string;
  primeiro_evento: string;
  ultimo_evento: string;
  ofertados: number;
  aceitos: number;
  recusados: number;
  descartados: number;
  sandbox: boolean;
  eventos: RegistroSugestao[];
};

export const listAuditoriaSugestoes = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        dias: z.number().int().min(1).max(90).default(14),
        phone: z.string().trim().optional(),
        status: z.enum(["ofertado", "aceito", "recusado", "descartado"]).optional(),
        sandbox: z.enum(["all", "real", "sandbox"]).default("all"),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.dias * 24 * 60 * 60 * 1000).toISOString();
    let q = supabaseAdmin
      .from("sugestoes_registros" as never)
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000);
    if (data.phone) q = q.ilike("phone", `%${data.phone}%`);
    if (data.status) q = q.eq("status", data.status);
    if (data.sandbox === "real") q = q.eq("sandbox", false);
    if (data.sandbox === "sandbox") q = q.eq("sandbox", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const registros = (rows ?? []) as unknown as RegistroSugestao[];

    const groups = new Map<string, AuditoriaConversa>();
    for (const r of registros) {
      const day = (r.created_at ?? "").slice(0, 10);
      const phone = r.phone ?? "desconhecido";
      const key = `${phone}::${day}`;
      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          phone: r.phone,
          data: day,
          primeiro_evento: r.created_at,
          ultimo_evento: r.created_at,
          ofertados: 0,
          aceitos: 0,
          recusados: 0,
          descartados: 0,
          sandbox: r.sandbox,
          eventos: [],
        };
        groups.set(key, g);
      }
      g.eventos.push(r);
      if (r.status === "ofertado") g.ofertados++;
      else if (r.status === "aceito") g.aceitos++;
      else if (r.status === "recusado") g.recusados++;
      else if (r.status === "descartado") g.descartados++;
      if (r.sandbox) g.sandbox = true;
      if (r.created_at < g.primeiro_evento) g.primeiro_evento = r.created_at;
      if (r.created_at > g.ultimo_evento) g.ultimo_evento = r.created_at;
    }
    const conversas = Array.from(groups.values()).map((g) => ({
      ...g,
      eventos: g.eventos.slice().sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }));
    conversas.sort((a, b) => b.ultimo_evento.localeCompare(a.ultimo_evento));
    return { conversas, total_eventos: registros.length };
  });
