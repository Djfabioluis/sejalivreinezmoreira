import { createServerFn } from "@tanstack/react-start";
import { runAgent } from "../../chat.server";
import { persistWaMessage } from "../persistence-helper.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const testPersistencePipeline = createServerFn({ method: "POST" })
  .handler(async () => {
    const phone = "5541999999999"; // Fictício
    const results: any[] = [];

    // Limpar contexto anterior para o teste
    await supabaseAdmin.from("wa_conversas").update({ customer_context: {} } as any).eq("phone", phone);

    // TURNO 1
    const text1 = "quero fazer mão hoje";
    const res1 = await runAgent({
      text: text1,
      messages: [{ role: "user", content: text1 }],
      conversationKey: phone,
      unidadeId: "5258", // Ventura
      sandbox: true,
      customerContext: {}
    } as any);

    // Simular persistência do Turno 1
    const message1 = { role: "user", content: text1, timestamp: new Date().toISOString() };
    const persist1 = await persistWaMessage(phone, message1);

    results.push({
      turn: 1,
      input: text1,
      bookingContext: (res1 as any).bookingContext,
      persistence: persist1
    });

    // TURNO 2
    // Primeiro carregar o contexto que deveria ter sido persistido
    const { data: conv } = await supabaseAdmin.from("wa_conversas").select("customer_context").eq("phone", phone).single();
    
    const text2 = "1"; // Selecionando a primeira opção
    const res2 = await runAgent({
      text: text2,
      messages: [
        { role: "user", content: text1 },
        { role: "assistant", content: (res1 as any).text || "" },
        { role: "user", content: text2 }
      ],
      conversationKey: phone,
      unidadeId: "5258",
      sandbox: true,
      customerContext: conv?.customer_context || {}
    } as any);

    results.push({
      turn: 2,
      input: text2,
      loadedContext: conv?.customer_context,
      bookingContext: (res2 as any).bookingContext,
      finalResult: res2
    });

    return results;
  });
