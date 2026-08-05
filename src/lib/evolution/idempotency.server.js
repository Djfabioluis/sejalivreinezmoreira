import { createHash } from "crypto";
import { logEvent } from "./logger.server";
export async function checkIdempotency(instance, messageId, phone, timestamp, text) {
    let finalId = messageId;
    if (!finalId || finalId === "unknown" || finalId === "undefined" || finalId === "") {
        const hash = createHash("md5").update(text).digest("hex").slice(0, 8);
        finalId = `temp-${instance}-${phone}-${timestamp}-${hash}`;
        await logEvent({
            instance,
            messageId: finalId,
            event: "validation",
            status: "missing_message_id",
            errorDetail: "Generated temporary ID"
        });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("evo_events").insert({
        message_id: finalId,
        instance
    });
    if (error) {
        if (error.code === "23505") {
            await logEvent({
                instance,
                messageId: finalId,
                event: "idempotency",
                status: "duplicate_message"
            });
            return { isDuplicate: true, finalMessageId: finalId };
        }
        // Fail-closed em outros erros
        await logEvent({
            instance,
            messageId: finalId,
            event: "idempotency",
            status: "error",
            errorDetail: error.message
        });
        throw new Error(`Idempotency check failed: ${error.message}`);
    }
    return { isDuplicate: false, finalMessageId: finalId };
}
