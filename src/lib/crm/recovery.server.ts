import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getBempConfig, bempFetch } from "@/lib/bemp.server";

/**
 * Main recovery processor.
 * Should be called by cron.
 */
export async function processAutomatedRecoveries() {
  console.log("[crm-recovery] Starting recovery pass...");

  // 1. Find abandoned customers
  const { data: allAbandoned, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("phone, abandonment_reason, last_interaction_at")
    .eq("current_stage", "ABANDONADO");

  if (error || !allAbandoned) {
    if (error) console.error("[crm-recovery] Error fetching abandoned:", error.message);
    return;
  }

  const GENERIC_ABANDONMENT_REASONS_TO_SKIP = ["PRICE"];

  for (const customer of allAbandoned) {
    try {
      if (GENERIC_ABANDONMENT_REASONS_TO_SKIP.includes(customer.abandonment_reason)) {
        // "Se abandonment_reason == PRICE ↓ não insistir."
        continue;
      }

      // Check if we already tried recovering this recently (24h)
      const { data: existingRecovery } = await supabaseAdmin
        .from("crm_recoveries")
        .select("id")
        .eq("phone", customer.phone)
        .eq("status", "ENVIADO")
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingRecovery) continue;

      // Also check crm_followups to avoid duplicates if we use that table
      const { data: existingFollowup } = await supabaseAdmin
        .from("crm_followups")
        .select("id")
        .eq("phone", customer.phone)
        .in("status", ["PENDING", "READY", "SENT"])
        .eq("stage", "ABANDONED_BOOKING")
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existingFollowup) continue;

      if (customer.abandonment_reason === 'PROFESSIONAL_UNAVAILABLE') {
        await handleProfessionalRecovery(customer);
      } else if (customer.abandonment_reason === 'SATURDAY_FULL') {
        await handleSaturdayRecovery(customer);
      } else {
        await handleGenericAbandonmentRecovery(customer);
      }
    } catch (err) {
      console.error(`[crm-recovery] Failed for ${customer.phone}:`, err);
    }
  }
}

async function handleProfessionalRecovery(customer: any) {
  // Logic: "Se surgir horário ↓ enviar automaticamente"
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("customer_context, instance, phone_number, contact_name, unidade_id")
    .eq("phone", customer.phone)
    .single();

  const ctx = (conv?.customer_context as any) || {};
  const profId = ctx.preferred_professional_id || ctx.professional_id;
  const svcId = ctx.service_id;
  const unitId = conv?.unidade_id || ctx.unidade_id;

  if (!profId || !svcId || !unitId) return;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];

  const cfg = await getBempConfig();
  const slotsUrl = `${cfg.apiBase}/salons/${unitId}/services/${svcId}/professionals/${profId}/slots?date=${dateStr}`;
  
  try {
    const slots: any = await bempFetch(slotsUrl);
    const available = Array.isArray(slots) ? slots : ((slots as any)?.data || []);
    
    if (available.length > 0) {
      const bestSlot = available[0];
      const time = bestSlot.start.split('T')[1].substring(0, 5);
      const profName = ctx.professional_name || "a profissional";

      const message = `Boa notícia, ${conv?.contact_name || 'cliente'}! 😊\n\nA ${profName} abriu um horário amanhã às ${time}.\n\nDeseja que eu reserve?`;
      
      await sendRecoveryMessage(customer.phone, message, conv as any, 'PROFESSIONAL_UNAVAILABLE', { slot: bestSlot });
    }
  } catch (e) {
    console.error("[crm-recovery] Error checking slots:", e);
  }
}

async function handleSaturdayRecovery(customer: any) {
  // Logic: "Se abrir sábado ↓ avisar"
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("customer_context, instance, phone_number, contact_name, unidade_id")
    .eq("phone", customer.phone)
    .single();

  const ctx = (conv?.customer_context as any) || {};
  const svcId = ctx.service_id;
  const unitId = conv?.unidade_id || ctx.unidade_id;

  if (!svcId || !unitId) return;

  const today = new Date();
  const nextSat = new Date();
  nextSat.setDate(today.getDate() + (6 - today.getDay() + 7) % 7);
  if (today.getDay() === 6) nextSat.setDate(today.getDate() + 7);
  
  const dateStr = nextSat.toISOString().split('T')[0];
  const cfg = await getBempConfig();
  const slotsUrl = `${cfg.apiBase}/salons/${unitId}/services/${svcId}/slots?date=${dateStr}`;

  try {
    const slots: any = await bempFetch(slotsUrl);
    const available = Array.isArray(slots) ? slots : ((slots as any)?.data || []);
    
    if (available.length > 0) {
      const message = `Olá ${conv?.contact_name || 'cliente'}! Passando para avisar que abriram horários para este sábado. ✨\n\nGostaria de aproveitar e garantir o seu atendimento?`;
      await sendRecoveryMessage(customer.phone, message, conv as any, 'SATURDAY_FULL', { date: dateStr });
    }
  } catch (e) {
    console.error("[crm-recovery] Saturday check failed:", e);
  }
}

/**
 * NEW: Generic abandonment recovery.
 * Creates a standard follow-up via crm_followups.
 */
async function handleGenericAbandonmentRecovery(customer: any) {
  console.log(`[crm-recovery] Handling generic recovery for ${customer.phone} (Reason: ${customer.abandonment_reason})`);
  
  // 1. Get conversation to check name and context
  const { data: conv } = await supabaseAdmin
    .from("wa_conversas")
    .select("contact_name, customer_context, instance")
    .eq("phone", customer.phone)
    .maybeSingle();

  const contactName = conv?.contact_name || "cliente";
  const firstName = contactName.split(' ')[0];
  const instance = conv?.instance || "agente-5541998430354";

  // 2. Create standard follow-up
  const messageTemplate = `Oi {{primeiro_nome}}! Notei que você não finalizou seu agendamento. Ainda tem interesse? Posso te ajudar a escolher um horário 😊`;

  const { data: newFollowup, error } = await supabaseAdmin
    .from("crm_followups")
    .insert({
      phone: customer.phone,
      stage: "ABANDONED_BOOKING",
      reason: customer.abandonment_reason || "GENERIC_ABANDONMENT",
      status: "READY",
      scheduled_at: new Date().toISOString(),
      message_template: messageTemplate,
      priority: 50,
      metadata: {
        source: "recovery_engine",
        original_reason: customer.abandonment_reason,
        instance
      }
    } as any)
    .select()
    .single();

  if (error) {
    console.error("[crm-recovery] Failed to create generic follow-up:", error.message);
  } else {
    // Also record in crm_recoveries to avoid duplicate recovery attempts (from this engine)
    await supabaseAdmin.from("crm_recoveries").insert({
      phone: customer.phone,
      reason: customer.abandonment_reason,
      status: 'PENDING_FOLLOWUP',
      metadata: { followup_id: newFollowup.id }
    });
    
    console.log(`[crm-recovery] Created follow-up ${newFollowup.id} for ${customer.phone}`);
  }
}

async function sendRecoveryMessage(phone: string, text: string, conv: any, reason: string, metadata: any) {
  const { sendEvolutionText } = await import("@/lib/evolution.server");
  
  const result = await sendEvolutionText(conv.instance, conv.phone_number, text);
  
  // Log recovery
  await supabaseAdmin.from("crm_recoveries").insert({
    phone,
    reason,
    status: result.success ? 'ENVIADO' : 'FALHA',
    sent_at: new Date().toISOString(),
    metadata: { ...metadata, evolution_response: result.data }
  });

  if (result.success) {
    const messageId = result.data?.key?.id || result.data?.id || result.data?.message?.key?.id;
    
    // Append to chat
    await supabaseAdmin.rpc("append_wa_message", {
      p_phone: phone,
      p_message: {
        id: messageId || `rec-${Date.now()}`,
        role: 'assistant',
        parts: [{ type: 'text', text }],
        createdAt: new Date().toISOString()
      },
      p_instance: conv.instance,
      p_phone_number: conv.phone_number,
      p_increment_unread: false,
      p_new_status: "aguardando"
    });

    // Update pipeline to bring them back to life
    const { updateCustomerPipeline } = await import("../crm.server");
    await updateCustomerPipeline({
      phone,
      stage: 'IDENTIFICANDO_SERVICO', 
      nextAction: 'Recovery sent'
    });

    console.log(`[crm-recovery] Sent direct recovery to ${phone} for ${reason}`);
  }
}