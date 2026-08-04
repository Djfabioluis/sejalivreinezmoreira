import { extractConversationMessageText } from "@/lib/whatsapp-inbox.functions";

export function normalizeConversationHistory(rawHistory: any[], currentText: string) {
  if (!Array.isArray(rawHistory)) return [];

  const seenIds = new Set();
  const history = rawHistory
    .filter((m: any) => {
      if (!m.id || seenIds.has(m.id)) return false;
      seenIds.add(m.id);
      return true;
    })
    .map((m: any) => ({
      role: m.role === "operator" ? "assistant" : m.role,
      parts: [{ type: "text", text: extractConversationMessageText(m) }]
    }))
    .slice(-10);

  // Garantir que a mensagem atual está no final se não estiver no histórico
  if (!history.some((m: any) => m.parts[0].text === currentText)) {
    history.push({ role: "user", parts: [{ type: "text", text: currentText }] });
  }

  return history;
}
