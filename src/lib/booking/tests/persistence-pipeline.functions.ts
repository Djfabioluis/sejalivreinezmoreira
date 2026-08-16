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
    const originalError = console.error;
    
    console.log = (...args) => {
      logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalLog(...args);
    };
    console.error = (...args) => {
      logs.push(`[ERROR] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '));
      originalError(...args);
    };

    try {
      await supabaseAdmin.from("wa_conversas").update({ customer_context: {} } as any).eq("phone", phone);

      const text1 = "quero fazer mão hoje";
      const messages1 = [{ role: "user", content: text1 }];
      
      logs.push("--- EXECUTANDO TURNO 1 ---");
      
      const res1 = await runAgent({
        text: text1,
        messages: messages1,
        conversationKey: phone,
        unidadeId: "5258", 
        sandbox: true,
        customerContext: {}
      } as any);

      results.push({
        turn: 1,
        text: (res1 as any).text,
        bookingContext: (res1 as any).bookingContext
      });

    } catch (err: any) {
      logs.push(`CRITICAL_ERROR: ${err.message}`);
      results.push({ error: err.message, logs: logs });
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }

    return { results, logs };
  });
