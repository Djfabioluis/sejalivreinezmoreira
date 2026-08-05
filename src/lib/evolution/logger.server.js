export async function logEvent(entry) {
    try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("evo_webhook_logs").insert({
            instance: entry.instance,
            message_id: entry.messageId ?? null,
            event: entry.event,
            status: entry.status,
            duration_ms: entry.durationMs ?? null,
            error_detail: entry.errorDetail ? String(entry.errorDetail).slice(0, 500) : null,
            payload: entry.payload ? JSON.stringify(entry.payload) : null
        });
    }
    catch (err) {
        console.error("[evolution] log_failed", err);
    }
}
