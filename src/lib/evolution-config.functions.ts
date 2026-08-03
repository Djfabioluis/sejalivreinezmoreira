import { hasRole } from "@/lib/roles";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVOLUTION_SETTINGS_ID = 5; // ID na tabela base_conhecimento

export type EvolutionConfig = {
  url: string;
  apiKey: string;
};

async function readEvolutionConfigFromDb(): Promise<EvolutionConfig | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", EVOLUTION_SETTINGS_ID)
      .maybeSingle();
    
    if (error || !data) return null;
    
    const raw = (data as { conteudo: string }).conteudo;
    const parsed = JSON.parse(raw) as Partial<EvolutionConfig>;
    
    if (parsed.url && parsed.apiKey) {
      return {
        url: parsed.url,
        apiKey: parsed.apiKey,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export const getEvolutionSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isAdmin = await hasRole(context.userId, "admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    
    const db = await readEvolutionConfigFromDb();
    if (db) return { ...db, source: "db" };
    
    return {
      url: process.env.EVOLUTION_API_URL || "",
      apiKey: process.env.EVOLUTION_API_KEY ? "••••••••" : "",
      source: "env",
    };
  });

export const saveEvolutionSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        url: z.string().trim().url("URL inválida").startsWith("https://", "A URL deve usar HTTPS"),
        apiKey: z.string().trim().min(5, "API Key obrigatória"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const isAdmin = await hasRole(context.userId, "admin");
    if (!isAdmin) throw new Error("Acesso restrito a administradores.");
    
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .upsert({
        id: EVOLUTION_SETTINGS_ID,
        conteudo: JSON.stringify({
          url: data.url.replace(/\/+$/, ""),
          apiKey: data.apiKey,
        }),
        updated_at: new Date().toISOString(),
      } as never);
    
    if (error) throw new Error(error.message);
    return { ok: true };
  });
