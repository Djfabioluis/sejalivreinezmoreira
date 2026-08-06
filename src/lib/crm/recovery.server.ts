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

  // 1. Find abandoned customers with specific reasons
  const { data: abandoned, error } = await supabaseAdmin
    .from("crm_customer_pipeline")
    .select("phone, abandonment_reason, last_interaction_at")
    .eq("current_stage", "ABANDONADO")
    .in("abandonment_reason", ["PROFESSIONAL_UNAVAILABLE", "SATURDAY_FULL"]);

  if (error || !abandoned) {
    if (error) console.error("[crm-recovery] Error fetching abandoned:", error.message);
    return;
  }

  for (const customer of abandoned) {
    try {
      if (customer.abandonment_reason === 'PRICE') {
        // "Se abandonment_reason == PRICE ↓ não insistir."
        continue;
      }

      // Check if we already tried recovering this recently
      const { data: existing } = await supabaseAdmin
        .from("crm_recoveries")
        .select("id")
        .eq("phone", customer.phone)
        .eq("status", "ENVIADO")
        .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (existing) continue;

      if (customer.abandonment_reason === 'PROFESSIONAL_UNAVAILABLE') {
        await handleProfessionalRecovery(customer);
      } else if (customer.abandonment_reason === 'SATURDAY_FULL') {
        await handleSaturdayRecovery(customer);
      }
    } catch (err) {
      console.error(`[crm-recovery] Failed for ${customer.phone}:`, err);
    }
  }
}

async function handleProfessionalRecovery(customer: any) {
  // Logic: "Se surgier horário ↓ enviar automaticamente"
  // We check Bemp for slots for the preferred professional (stored in context usually)
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

  // Check slots for tomorrow or near future
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

  // Find next Saturday
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

async function sendRecoveryMessage(phone: string, text: string, conv: any, reason: string, metadata: any) {
  const { sendEvolutionText } = await import("@/lib/evolution.server");
  
  await sendEvolutionText(conv.instance, conv.phone_number, text);
  
  // Log recovery
  await supabaseAdmin.from("crm_recoveries").insert({
    phone,
    reason,
    status: 'ENVIADO',
    sent_at: new Date().toISOString(),
    metadata
  });

  // Append to chat
  await supabaseAdmin.rpc("append_wa_message", {
    p_phone: phone,
    p_message: {
      id: `rec-${Date.now()}`,
      role: 'assistant',
      parts: [{ type: 'text', text }],
      createdAt: new Date().toISOString()
    },
    p_instance: conv.instance,
    p_phone_number: conv.phone_number,
    p_increment_unread: false,
    p_new_status: "aguardando"
  });

  // Update pipeline to identify they are being recovered
  const { updateCustomerPipeline } = await import("../crm.server");
  await updateCustomerPipeline({
    phone,
    stage: 'IDENTIFICANDO_SERVICO', // Bring them back to life
    nextAction: 'Recovery sent'
  });

  console.log(`[crm-recovery] Sent recovery to ${phone} for ${reason}`);
}
