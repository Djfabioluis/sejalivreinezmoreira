import { hasRole } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export type AgenteWa = {
  id: string;
  nome: string;
  tipo: "feminino" | "masculino";
  telefone: string;
  instancia: string;
  status: "aguardando_qr" | "conectado" | "desconectado";
  criado_em: string;
};

const OriginSchema = z
  .string()
  .trim()
  .url("Origem inválida")
  .max(300)
  .refine((v) => v.startsWith("http://") || v.startsWith("https://"), "Origem inválida");

export const listAgentes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isEvolutionConfigured } = await import("@/lib/evolution.server");
    const { data, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("id,nome,tipo,telefone,instancia,status,criado_em")
      .order("criado_em", { ascending: false });
    if (error) throw new Error(error.message);
    return {
      configured: await isEvolutionConfigured(),
      items: (data ?? []) as unknown as AgenteWa[],
    };
  });

export const criarAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        tipo: z.enum(["feminino", "masculino"]),
        telefone: z.string().trim().min(10, "Número inválido").max(20),
        origin: OriginSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const digits = data.telefone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 15) throw new Error("Número de WhatsApp inválido.");
    const full = digits.startsWith("55") ? digits : `55${digits}`;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createInstance, getQrCode, instanceNameFor } = await import("@/lib/evolution.server");

    const instancia = instanceNameFor(full);
    const webhookUrl = `${data.origin.replace(/\/+$/, "")}/api/public/whatsapp-evolution`;
    try {
      await createInstance(instancia, webhookUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao conectar à Evolution API.";
      return { agente: null, qr: null, error: message };
    }

    const nome = data.tipo === "feminino" ? "Julia" : "Bruno";
    const { data: row, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .upsert(
        {
          nome,
          tipo: data.tipo,
          telefone: full,
          instancia,
          status: "aguardando_qr",
          criado_por: context.userId,
          atualizado_em: new Date().toISOString(),
        } as never,
        { onConflict: "instancia" },
      )
      .select("id,nome,tipo,telefone,instancia,status,criado_em")
      .single();
    if (error) throw new Error(error.message);

    const qr = await getQrCode(instancia);
    return { agente: row as unknown as AgenteWa, qr, error: null };
  });

export const gerarQrAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), origin: OriginSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createInstance, getQrCode, getConnectionState } = await import(
      "@/lib/evolution.server"
    );
    const { data: row, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("instancia")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const instancia = (row as unknown as { instancia: string }).instancia;
    const webhookUrl = `${data.origin.replace(/\/+$/, "")}/api/public/whatsapp-evolution`;
    await createInstance(instancia, webhookUrl).catch(() => undefined);
    const state = await getConnectionState(instancia);
    if (state === "conectado") {
      await supabaseAdmin
        .from("wa_agentes" as never)
        .update({ status: "conectado", atualizado_em: new Date().toISOString() } as never)
        .eq("id", data.id);
      return { qr: null, status: "conectado" as const };
    }
    const qr = await getQrCode(instancia);
    return { qr, status: "aguardando_qr" as const };
  });

export const statusAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getConnectionState } = await import("@/lib/evolution.server");
    const { data: row, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("instancia")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const status = await getConnectionState(
      (row as unknown as { instancia: string }).instancia,
    );
    await supabaseAdmin
      .from("wa_agentes" as never)
      .update({ status, atualizado_em: new Date().toISOString() } as never)
      .eq("id", data.id);
    return { status };
  });

export const desconectarAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logoutInstance } = await import("@/lib/evolution.server");
    const { data: row, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("instancia")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await logoutInstance((row as unknown as { instancia: string }).instancia);
    await supabaseAdmin
      .from("wa_agentes" as never)
      .update({ status: "desconectado", atualizado_em: new Date().toISOString() } as never)
      .eq("id", data.id);
    return { ok: true };
  });

export const removerAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deleteInstance } = await import("@/lib/evolution.server");
    const { data: row, error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("instancia")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    await deleteInstance((row as unknown as { instancia: string }).instancia).catch(
      () => undefined,
    );
    const { error: delErr } = await supabaseAdmin
      .from("wa_agentes" as never)
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });
