import { createServerFn } from "@tanstack/react-start";
import { runAgent } from "../../chat.server";
import { persistWaMessage } from "../persistence-helper.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const testPersistencePipeline = createServerFn({ method: "POST" })
  .handler(async () => {
    const phone = "5541999999999"; 
    const results: any[] = [];
    
    // Captura de logs para o Dashboard
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalLog(...args);
    };

    try {
      // Limpar contexto anterior para o teste
      await supabaseAdmin.from("wa_conversas").update({ customer_context: {} } as any).eq("phone", phone);

      // TURNO 1
      const text1 = "quero fazer mão hoje";
      // CORREÇÃO DO HARNESS: messages deve ser Array
      const messages1 = [{ role: "user", content: text1 }];
      
      logs.push("--- EXECUTANDO TURNO 1 ---");
      logs.push(`Calling runAgent with messages as Array: ${Array.isArray(messages1)}`);

      const res1 = await runAgent({
        text: text1,
        messages: messages1,
        conversationKey: phone,
        unidadeId: "5258", // Ventura
        sandbox: true,
        customerContext: {}
      } as any);

      // Simular persistência do Turno 1
      const message1 = { role: "user", content: text1, parts: [{ type: "text", text: text1 }], timestamp: new Date().toISOString() };
      const persist1 = await persistWaMessage(phone, message1);

      results.push({
        turn: 1,
        input: text1,
        bookingContext: (res1 as any).bookingContext,
        persistence: persist1
      });

      // TURNO 2
      const { data: conv } = await supabaseAdmin.from("wa_conversas").select("customer_context").eq("phone", phone).single();
      
      const text2 = "1"; 
      const messages2 = [
        { role: "user", content: text1 },
        { role: "assistant", content: (res1 as any).text || "" },
        { role: "user", content: text2 }
      ];

      logs.push("--- EXECUTANDO TURNO 2 ---");
      logs.push(`Calling runAgent with messages as Array: ${Array.isArray(messages2)}`);

      const res2 = await runAgent({
        text: text2,
        messages: messages2,
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
        finalResult: res2,
        logs: logs
      });

    } catch (err: any) {
      logs.push(`CRITICAL_ERROR: ${err.message}`);
      if (err.stack) logs.push(`STACK: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
      results.push({ error: err.message, logs: logs });
    } finally {
      console.log = originalLog;
    }

    return results;
  });
