import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

/**
 * Analisador de Agenda (Agenda Analyzer)
 * Identifica horários vagos, profissionais ociosos e padrões de procura.
 */
export async function analyzeAgenda() {
  console.log("[agenda-analyzer] Analisando agenda do salão...");
  
  try {
    const cfg = await getBempConfig();
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Buscar unidades (salões)
    const salons: any = await bempFetch(`${cfg.apiBase}/salons`);
    if (!salons || !Array.isArray(salons)) return;

    for (const salon of salons) {
      await analyzeSalonAgenda(salon.id, today);
    }
  } catch (error) {
    console.error("[agenda-analyzer] Erro ao analisar agenda:", error);
  }
}

async function analyzeSalonAgenda(salonId: number, date: string) {
  const cfg = await getBempConfig();
  
  // 2. Buscar serviços para ter uma base de slots
  const services: any = await bempFetch(`${cfg.apiBase}/salons/${salonId}/services`);
  if (!services || !Array.isArray(services)) return;
  
  // Pegamos o serviço mais comum ou o primeiro para testar disponibilidade geral
  const serviceId = services[0]?.id;
  if (!serviceId) return;

  // 3. Buscar slots disponíveis para o dia
  const slots: any = await bempFetch(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/slots/${date}`);
  
  const availableSlots = Array.isArray(slots) ? slots : [];
  
  // 4. Identificar Oportunidades de Horários Vagos (EMPTY_SLOT)
  if (availableSlots.length > 0) {
    for (const slot of availableSlots.slice(0, 5)) { // Limitar a 5 oportunidades por análise para não sobrecarregar
      await createSlotOpportunity(salonId, serviceId, slot);
    }
  }

  // 5. Analisar Profissionais Ociosos
  const professionals: any = await bempFetch(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/professionals`);
  if (Array.isArray(professionals)) {
    for (const prof of professionals) {
      // Se o profissional tem muitos horários vagos, marcamos como ocioso
      const profSlots: any = await bempFetch(`${cfg.apiBase}/salons/${salonId}/services/${serviceId}/professionals/${prof.id}/slots/${date}`);
      const availableProfSlots = Array.isArray(profSlots) ? profSlots : [];
      
      if (availableProfSlots.length > 5) {
        console.log(`[agenda-analyzer] Profissional ocioso detectado: ${prof.name} em ${date}`);
      }
    }
  }
}

async function createSlotOpportunity(salonId: number, serviceId: number, slot: any) {
  const startAt = slot.start_at || slot.start;
  if (!startAt) return;

  const { data: existing } = await supabaseAdmin
    .from("crm_slot_opportunities")
    .select("id")
    .eq("unidade_id", String(salonId))
    .eq("start_at", startAt)
    .maybeSingle();

  if (!existing) {
    await supabaseAdmin
      .from("crm_slot_opportunities")
      .insert({
        unidade_id: String(salonId),
        service_id: String(serviceId),
        professional_id: slot.professional_id ? String(slot.professional_id) : null,
        start_at: startAt,
        end_at: slot.end_at || slot.end || startAt,
        status: 'pending',
        metadata: {
          price_estimated: slot.price || 0,
          source: 'agenda_analyzer'
        }
      });
      
    console.log(`[agenda-analyzer] Nova oportunidade de horário: ${startAt} (Salon ${salonId})`);
  }
}
