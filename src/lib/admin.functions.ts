import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getAdminStats = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const { count: profCount } = await supabaseAdmin
        .from('professional_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ATIVO');

      const { count: contractCount } = await supabaseAdmin
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ASSINADO');

      const { count: pendingContracts } = await supabaseAdmin
        .from('contracts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'AGUARDANDO_ASSINATURA');

      return {
        activeProfessionals: profCount || 0,
        signedContracts: contractCount || 0,
        pendingSignatures: pendingContracts || 0,
        pendingManuals: 0
      };
    } catch (e) {
      console.error("Admin stats fetch error:", e);
      return {
        activeProfessionals: 0,
        signedContracts: 0,
        pendingSignatures: 0,
        pendingManuals: 0
      };
    }
  });

export const getCollaborators = createServerFn({ method: "GET" })
  .handler(async () => {
    const { data, error } = await supabaseAdmin
      .from('professional_profiles')
      .select('*')
      .order('full_name');

    if (error) throw error;
    return data || [];
  });

