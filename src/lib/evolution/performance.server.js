/**
 * Utilitários para rastreamento de performance (Tracing).
 */
export class PerformanceTrace {
    steps = [];
    startTimestamp;
    traceId;
    inboundMessageId;
    conversationId;
    instanceId;
    phoneLast4;
    constructor(params) {
        this.traceId = params.traceId;
        this.inboundMessageId = params.inboundMessageId;
        this.conversationId = params.conversationId;
        this.instanceId = params.instanceId;
        this.phoneLast4 = params.phoneLast4;
        this.startTimestamp = Date.now();
        this.record("WHATSAPP_WEBHOOK_RECEIVED");
    }
    record(step, payload, status = "success") {
        const now = Date.now();
        const prevStep = this.steps[this.steps.length - 1];
        const durationMs = prevStep ? now - prevStep.timestamp : 0;
        const traceStep = {
            step,
            timestamp: now,
            durationMs,
            payload
        };
        this.steps.push(traceStep);
        // Log assíncrono para o banco
        this.persistStep(traceStep, status);
        console.log(`[TRACE][${this.traceId}] ${step.padEnd(30)} ${String(durationMs).padStart(5)}ms`);
    }
    async persistStep(step, status) {
        try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin.from("evo_trace_logs").insert({
                trace_id: this.traceId,
                inbound_message_id: this.inboundMessageId,
                conversation_id: this.conversationId,
                instance_id: this.instanceId,
                phone_last4: this.phoneLast4,
                step: step.step,
                status,
                duration_ms: step.durationMs,
                timestamp: new Date(step.timestamp).toISOString(),
                payload: step.payload
            });
        }
        catch (err) {
            // Silencioso para não afetar o fluxo principal
        }
    }
    getTraceId() {
        return this.traceId;
    }
    getTotalDuration() {
        return Date.now() - this.startTimestamp;
    }
    updateContext(ctx) {
        if (ctx.conversationId)
            this.conversationId = ctx.conversationId;
        if (ctx.instanceId)
            this.instanceId = ctx.instanceId;
        if (ctx.phoneLast4)
            this.phoneLast4 = ctx.phoneLast4;
    }
}
