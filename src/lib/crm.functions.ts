import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasRole } from "@/lib/roles";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const isAdmin = await hasRole(ctx.userId, "admin");
  if (!isAdmin) throw new Error("Acesso restrito a administradores.");
}

export const listCustomerPipeline = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    
    const { data, error } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("*")
      .order("conversion_score", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const getCRMDashboardStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    
    const { data: pipeline, error: pError } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("*");

    if (pError) throw new Error(pError.message);

    const { data: followups, error: fError } = await supabaseAdmin
      .from("crm_followups")
      .select("status");

    if (fError) throw new Error(fError.message);

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    return {
      abandonedAppointments: pipeline.filter(c => c.current_stage === 'ABANDONADO').length,
      hotCustomers: pipeline.filter(c => (c.conversion_score || 0) >= 70).length,
      coldCustomers: pipeline.filter(c => (c.conversion_score || 0) < 30).length,
      vipCustomers: pipeline.filter(c => (c.conversion_score || 0) >= 90).length,
      beautyPlanCustomers: pipeline.filter(c => {
        const context = (c as any).customer_context?.customer_context || {};
        const plans = context.activePlans || [];
        return plans.some((p: any) => 
          String(p.name).toLowerCase().includes('beauty') || 
          String(p.name).toLowerCase().includes('plano')
        );
      }).length,
      noReturn30: pipeline.filter(c => c.last_interaction_at && new Date(c.last_interaction_at) <= thirtyDaysAgo).length,
      noReturn60: pipeline.filter(c => c.last_interaction_at && new Date(c.last_interaction_at) <= sixtyDaysAgo).length,
      noReturn90: pipeline.filter(c => c.last_interaction_at && new Date(c.last_interaction_at) <= ninetyDaysAgo).length,
      pendingFollowups: followups.filter(f => f.status === 'PENDENTE').length,
      sentFollowups: followups.filter(f => f.status === 'ENVIADO' || f.status === 'ENCERRADO').length,
      conversionRate: pipeline.length > 0 ? (pipeline.filter(c => c.current_stage === 'CONVERTIDO' || c.current_stage === 'AGENDADO').length / pipeline.length) * 100 : 0,
      lossReasons: pipeline.reduce((acc: Record<string, number>, c) => {
        if (c.abandonment_reason) {
          acc[c.abandonment_reason] = (acc[c.abandonment_reason] || 0) + 1;
        }
        return acc;
      }, {})
    };
  });

export const listOpportunities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    
    const { data, error } = await (supabaseAdmin
      .from("crm_opportunities" as any) as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

