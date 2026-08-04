import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertPermission } from "@/lib/permissions.functions";

export const getBaseConhecimento = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPermission(context, "base-conhecimento");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo, updated_at")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as { conteudo: string; updated_at: string } | null) ?? {
      conteudo: "",
      updated_at: new Date().toISOString(),
    };
  });

export const saveBaseConhecimento = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ conteudo: z.string().min(1).max(20000) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPermission(context, "base-conhecimento");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .upsert({ id: 1, conteudo: data.conteudo, updated_at: new Date().toISOString() } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
