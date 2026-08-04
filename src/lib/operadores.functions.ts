import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "@/lib/permissions.functions";

export type Operador = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  ativo: boolean;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export const listOperadores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(
  async ({ context }): Promise<Operador[]> => {
    await assertPermission(context, "operadores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("operadores" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as Operador[];
  },
);

export const createOperador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      nome: string;
      email?: string | null;
      telefone?: string | null;
      observacoes?: string | null;
    }) => {
      const nome = (input.nome ?? "").trim();
      if (!nome) throw new Error("Nome é obrigatório");
      if (nome.length > 120) throw new Error("Nome muito longo");
      const email = input.email?.trim() || null;
      if (email && email.length > 255) throw new Error("Email muito longo");
      const telefone = input.telefone?.trim() || null;
      if (telefone && telefone.length > 40) throw new Error("Telefone muito longo");
      const observacoes = input.observacoes?.trim() || null;
      if (observacoes && observacoes.length > 1000) throw new Error("Observações muito longas");
      return { nome, email, telefone, observacoes };
    },
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "operadores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("operadores" as never)
      .insert(data as never)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as Operador;
  });

export const updateOperador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id: string;
      nome?: string;
      email?: string | null;
      telefone?: string | null;
      observacoes?: string | null;
      ativo?: boolean;
    }) => {
      if (!input.id) throw new Error("ID obrigatório");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    await assertPermission(context, "operadores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: Record<string, unknown> = {};
    if (data.nome !== undefined) patch.nome = data.nome.trim();
    if (data.email !== undefined) patch.email = data.email?.trim() || null;
    if (data.telefone !== undefined) patch.telefone = data.telefone?.trim() || null;
    if (data.observacoes !== undefined) patch.observacoes = data.observacoes?.trim() || null;
    if (data.ativo !== undefined) patch.ativo = data.ativo;
    const { error } = await supabaseAdmin
      .from("operadores" as never)
      .update(patch as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteOperador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input.id) throw new Error("ID obrigatório");
    return input;
  })
  .handler(async ({ data, context }) => {
    await assertPermission(context, "operadores");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("operadores" as never)
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
