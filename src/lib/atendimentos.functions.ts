import { createServerFn } from "@tanstack/react-start";

export type ClienteAtendido = {
  phone: string;
  total_mensagens: number;
  ultima_atividade: string | null;
  ultima_mensagem: string | null;
};

export type AtendimentoHumano = {
  id: string;
  nome: string | null;
  phone: string | null;
  phone_country_code: string | null;
  phone_area_code: string | null;
  phone_number: string | null;
  motivo: string | null;
  canal: string;
  status: string;
  observacoes: string | null;
  sandbox: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

function formatPhone(row: {
  phone_country_code: string | null;
  phone_area_code: string | null;
  phone_number: string | null;
  phone: string | null;
}): string | null {
  if (row.phone) return row.phone;
  const cc = row.phone_country_code ?? "";
  const ac = row.phone_area_code ?? "";
  const nr = row.phone_number ?? "";
  const joined = `${cc}${ac}${nr}`.trim();
  return joined || null;
}

export const listClientesAtendidos = createServerFn({ method: "GET" }).handler(
  async (): Promise<ClienteAtendido[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("wa_conversas" as never)
      .select("phone, messages, updated_at")
      .order("updated_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);

    type Row = { phone: string; updated_at: string; messages: unknown };
    const rows = (data ?? []) as unknown as Row[];
    return rows.map((r) => {
      const msgs = Array.isArray(r.messages) ? (r.messages as Array<Record<string, unknown>>) : [];
      const last = msgs[msgs.length - 1];
      const lastText =
        last && typeof last === "object" && "content" in last
          ? String((last as { content: unknown }).content ?? "").slice(0, 160)
          : null;
      return {
        phone: r.phone,
        total_mensagens: msgs.length,
        ultima_atividade: r.updated_at,
        ultima_mensagem: lastText,
      };
    });
  },
);

export const listAtendimentosHumanos = createServerFn({ method: "GET" })
  .inputValidator((input: { status?: string } | undefined) => input ?? {})
  .handler(async ({ data }): Promise<AtendimentoHumano[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("atendimentos_humanos" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (data.status && data.status !== "todos") {
      q = q.eq("status", data.status);
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = (rows ?? []) as unknown as Array<AtendimentoHumano>;
    return list.map((r) => ({ ...r, phone: formatPhone(r) }));
  });

export const updateAtendimentoStatus = createServerFn({ method: "POST" })
  .inputValidator((input: { id: string; status: string; observacoes?: string }) => input)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = { status: data.status };
    if (data.observacoes !== undefined) patch.observacoes = data.observacoes;
    if (data.status === "resolvido") patch.resolved_at = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("atendimentos_humanos" as never)
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
