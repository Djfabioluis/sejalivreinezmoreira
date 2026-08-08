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
  telefone: string | null;
  instancia: string;
  status: "aguardando_qr" | "conectado" | "desconectado" | "aguardando_conexao" | "conectado_sem_unidade" | "ativo" | "inativo" | "erro_conexao" | "CONNECTING" | "QR_PENDING" | "CONNECTED" | "DISCONNECTED" | "ERROR";
  status_conexao: "conectado" | "conectando" | "desconectado" | null;
  ia_ativa: boolean;
  unidade_id: string | null;
  selected_unit_at: string | null;
  selected_unit_by: string | null;
  criado_em: string;
  last_connection_at: string | null;
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
      .select("id,nome,tipo,telefone,instancia,status,status_conexao,ia_ativa,unidade_id,selected_unit_at,selected_unit_by,criado_em,last_connection_at")
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
          status: "aguardando_conexao", // Novo status inicial
          criado_por: context.userId,
          atualizado_em: new Date().toISOString(),
          unidade_id: null, // Sem unidade no início
        } as never,
        { onConflict: "instancia" },
      )
      .select("id,nome,tipo,telefone,instancia,status,unidade_id,criado_em")
      .single();
    if (error) throw new Error(error.message);

    const qr = await getQrCode(instancia);
    return { agente: row as unknown as AgenteWa, qr, error: null };
  });

export const selecionarUnidadeAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ 
      agenteId: z.string().uuid(), 
      unidadeId: z.string().min(1) 
    }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { listSalons } = await import("@/lib/bemp.functions");
    
    // Validar unidade (Item 11)
    const salons = await listSalons();
    const unitExists = (salons as any[]).find((s: any) => String(s.id) === data.unidadeId);
    if (!unitExists) {
      throw new Error("Unidade inválida ou não encontrada.");
    }

    const { data: currentAgent } = await supabaseAdmin
      .from("wa_agentes" as never)
      .select("status, unidade_id")
      .eq("id", data.agenteId)
      .maybeSingle();

    const oldUnit = (currentAgent as any)?.unidade_id;
    const isNewSelection = !oldUnit;

    const { error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .update({
        unidade_id: data.unidadeId,
        status: "ativo",
        selected_unit_at: new Date().toISOString(),
        selected_unit_by: context.userId,
        atualizado_em: new Date().toISOString(),
      } as never)
      .eq("id", data.agenteId);

    if (error) throw new Error(error.message);

    // Logging (Item 12)
    try {
      const { supabaseAdmin: sb } = await import("@/integrations/supabase/client.server");
      const { data: agentData } = await sb
        .from("wa_agentes" as never)
        .select("instancia")
        .eq("id", data.agenteId)
        .single();
      
      if (agentData) {
        await sb.from("evo_webhook_logs" as never).insert({
          instance: (agentData as any).instancia,
          event: isNewSelection ? "unit_selected" : "unit_changed",
          status: "agent_activated"
        } as never);
      }
    } catch (logErr) {
      console.error("Erro ao registrar log de unidade:", logErr);
    }

    return { success: true };
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
      .select("instancia, status, unidade_id")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const ag = row as any;
    const instancia = ag.instancia;
    const webhookUrl = `${data.origin.replace(/\/+$/, "")}/api/public/whatsapp-evolution`;
    await createInstance(instancia, webhookUrl).catch(() => undefined);
    const state = await getConnectionState(instancia);
    
    if (state === "conectado") {
      const newStatus = (ag.unidade_id ? "ativo" : "conectado_sem_unidade") as AgenteWa["status"];
      await supabaseAdmin
        .from("wa_agentes" as never)
        .update({ status: newStatus, atualizado_em: new Date().toISOString() } as never)
        .eq("id", data.id);
      return { qr: null, status: newStatus };
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
      .select("instancia, unidade_id, status")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const ag = row as any;
    const state = await getConnectionState(ag.instancia);
    
    let newStatus: AgenteWa["status"] = state as AgenteWa["status"];
    if (state === "conectado") {
      newStatus = ag.unidade_id ? "ativo" : "conectado_sem_unidade";
    } else if (state === "desconectado") {
      newStatus = "inativo";
    }

    await supabaseAdmin
      .from("wa_agentes" as never)
      .update({ status: newStatus, atualizado_em: new Date().toISOString() } as never)
      .eq("id", data.id);
    return { status: newStatus };
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
      .update({ status: "inativo", atualizado_em: new Date().toISOString() } as never)
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

export const toggleIAAgente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("wa_agentes" as never)
      .update({ ia_ativa: data.enabled, atualizado_em: new Date().toISOString() } as never)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const syncEvolutionInstances = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getEvolutionConfig } = await import("@/lib/evolution.server");
    const config = await getEvolutionConfig();
    console.log("[AGENTS_SYNC_CLICK] Iniciando sincronização via Evolution API", { url: config.url });
    
    const res = await fetch(`${config.url}/instance/fetchInstances`, {
      headers: { "apikey": config.apiKey }
    });
    
    if (!res.ok) {
      console.error("[AGENTS_SYNC_FAILED] Erro HTTP ao buscar instâncias", res.status);
      throw new Error("Falha ao buscar instâncias da Evolution.");
    }
    
    const instances = await res.json();
    console.log("[EVOLUTION_INSTANCES_FETCHED]", { count: instances.length });
    
    let updatedCount = 0;
    let createdCount = 0;
    let ignoredCount = 0;
    
    for (const inst of instances) {
      const name = inst.instanceName;
      const statusConexao = inst.connectionStatus === "open" ? "conectado" : "desconectado";
      const telefone = inst.owner?.replace(/\D/g, "") || null;
      
      const { data: dbAgent } = await supabaseAdmin
        .from("wa_agentes" as never)
        .select("id, status, unidade_id")
        .eq("instancia", name)
        .maybeSingle();
        
      if (dbAgent) {
        const agent = dbAgent as any;
        // Preservar lógica de status: se conectado mas sem unidade, manter 'conectado_sem_unidade'
        let newStatus = statusConexao === "conectado" 
          ? (agent.unidade_id ? "ativo" : "conectado_sem_unidade")
          : "inativo";

        await supabaseAdmin
          .from("wa_agentes" as never)
          .update({ 
            status_conexao: statusConexao,
            status: newStatus,
            telefone: telefone || agent.telefone,
            atualizado_em: new Date().toISOString()
          } as never)
          .eq("id", agent.id);
        
        updatedCount++;
      } else {
        // Se não existe, podemos criar como um agente básico (Item 3.3)
        // Mas o requisito 4 diz para proteger agentes existentes.
        // Vamos apenas ignorar instâncias que não são agentes do sistema por enquanto para evitar duplicados indesejados, 
        // a menos que o usuário queira criar automaticamente.
        ignoredCount++;
      }
    }
    
    console.log("[AGENTS_SYNC_COMPLETED]", { updatedCount, createdCount, ignoredCount });
    return { 
      success: true,
      stats: { updatedCount, createdCount, ignoredCount }
    };
  });
