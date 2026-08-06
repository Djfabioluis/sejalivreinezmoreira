import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { assertPermission } from "@/lib/auth.server";

export const listCustomerPipeline = createServerFn({ method: "GET" })
  .handler(async ({ context }) => {
    await assertPermission(context.supabase, 'admin');
    
    const { data, error } = await supabaseAdmin
      .from("crm_customer_pipeline")
      .select("*")
      .order("conversion_score", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });
