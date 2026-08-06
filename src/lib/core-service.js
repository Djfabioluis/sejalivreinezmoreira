import { z } from "zod";
/**
 * Logger Central do Projeto
 * Padroniza logs entre frontend e backend (em ambiente de servidor salva no banco).
 */
class Logger {
    format(level, module, event, message, details, traceId) {
        return {
            level,
            module,
            event,
            message,
            details,
            traceId,
            timestamp: new Date().toISOString(),
        };
    }
    async persist(entry) {
        // No servidor, tentamos persistir em uma tabela central de logs
        if (typeof window === "undefined") {
            try {
                const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
                await supabaseAdmin.from("system_logs").insert(entry);
            }
            catch (err) {
                // Fallback para console se o banco falhar
                console.error("[logger] Fallback persist failure:", err);
            }
        }
        // Console output padronizado
        const logFn = entry.level === "error" || entry.level === "critical" ? console.error :
            entry.level === "warning" ? console.warn : console.log;
        logFn(`[${entry.level.toUpperCase()}] [${entry.module}] ${entry.event}${entry.message ? `: ${entry.message}` : ""}`, entry.details || "");
    }
    debug(module, event, message, details, traceId) {
        this.persist(this.format("debug", module, event, message, details, traceId));
    }
    info(module, event, message, details, traceId) {
        this.persist(this.format("info", module, event, message, details, traceId));
    }
    warn(module, event, message, details, traceId) {
        this.persist(this.format("warning", module, event, message, details, traceId));
    }
    error(module, event, message, details, traceId) {
        this.persist(this.format("error", module, event, message, details, traceId));
    }
    critical(module, event, message, details, traceId) {
        this.persist(this.format("critical", module, event, message, details, traceId));
    }
}
export const logger = new Logger();
/**
 * Zod Schema para respostas estruturadas de API/Server Functions
 */
export const StructuredResponseSchema = (dataSchema) => z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    errorCode: z.string().optional(),
    message: z.string().optional(),
    details: z.any().optional(),
    traceId: z.string().optional(),
});
