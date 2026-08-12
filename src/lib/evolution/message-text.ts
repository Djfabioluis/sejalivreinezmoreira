export function extractMessageText(message: any): string {
  if (!message) return "";

  const content = message.conversation || 
                  message.extendedTextMessage?.text || 
                  message.imageMessage?.caption || 
                  message.videoMessage?.caption || 
                  message.documentMessage?.caption || 
                  message.buttonsResponseMessage?.selectedButtonId || 
                  message.buttonsResponseMessage?.selectedDisplayText ||
                  message.listResponseMessage?.title || 
                  message.listResponseMessage?.singleSelectReply?.selectedRowId ||
                  message.templateButtonReplyMessage?.selectedId || 
                  message.interactiveResponseMessage?.body?.text ||
                  message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson ||
                  message.ephemeralMessage?.message ||
                  message.viewOnceMessage?.message ||
                  message.viewOnceMessageV2?.message ||
                  message.documentWithCaptionMessage?.message ||
                  message.editedMessage?.message ||
                  message.text; // Fallback para casos simples

  if (typeof content === "string") return content;
  
  // Recursão real e segura para mensagens aninhadas (ephemeral, viewOnce, etc)
  if (typeof content === "object" && content !== null) {
    // Evitar loop infinito se o objeto for idêntico ao pai
    if (content === message) return "";
    return extractMessageText(content);
  }

  return "";
}
