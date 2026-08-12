import { extractConversationMessageText } from "@/lib/whatsapp-inbox.functions";
export function normalizeConversationHistory(rawHistory, currentText, currentMessageId) {
    if (!Array.isArray(rawHistory))
        return [];
    const seenIds = new Set();
    if (currentMessageId) {
        seenIds.add(currentMessageId);
    }
    const history = rawHistory
        .filter((m) => {
        const id = m.id || (m.messages && m.messages.id);
        if (!id || seenIds.has(id))
            return false;
        seenIds.add(id);
        return true;
    })
        .map((m) => ({
        role: m.role === "operator" ? "assistant" : m.role,
        parts: [{ type: "text", text: extractConversationMessageText(m) }]
    }))
        .slice(-10);
    // A mensagem atual sempre entra como a última do histórico
    history.push({ role: "user", parts: [{ type: "text", text: currentText }] });
    return history;
}
