import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const WELCOME_ID = 2;

export const DEFAULT_WELCOME =
  "Oi! 👋 Sou a Julia, recepcionista do Salão Seja Livre. Vou te ajudar a agendar sua consulta em pouquinhos passos. Para começar, como posso te chamar?";

export const getWelcomeMessage = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("base_conhecimento" as never)
    .select("conteudo, updated_at")
    .eq("id", WELCOME_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { conteudo: string; updated_at: string } | null;
  return {
    conteudo: row?.conteudo ?? DEFAULT_WELCOME,
    updated_at: row?.updated_at ?? null,
    is_default: !row,
  };
});

export const saveWelcomeMessage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ conteudo: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .upsert({
        id: WELCOME_ID,
        conteudo: data.conteudo,
        updated_at: new Date().toISOString(),
      } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
