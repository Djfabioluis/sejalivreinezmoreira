import { hasRole } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listEvolutionLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => 
    z.object({
      instance: z.string().optional(),
      messageId: z.string().optional(),
      status: z.enum(["success", "error", "received", "all"]).default("all"),
      page: z.number().default(0),
      limit: z.number().default(50),
    }).parse(data)
  )
  .handler(async ({ data, context }) => {
    const isAdmin = await hasRole(context.userId, "admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    
    let query = supabaseAdmin
      .from("evo_webhook_logs" as never)
      .select("*", { count: "exact" });
    
    if (data.instance) {
      query = query.ilike("instance", `%${data.instance}%`);
    }
    
    if (data.messageId) {
      query = query.ilike("message_id", `%${data.messageId}%`);
    }
    
    if (data.status !== "all") {
      query = query.eq("status", data.status);
    }
    
    const from = data.page * data.limit;
    const to = from + data.limit - 1;
    
    const { data: logs, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    
    if (error) throw new Error(error.message);
    
    return {
      logs: logs as any[],
      count: count || 0,
      page: data.page,
      limit: data.limit
    };
  });
