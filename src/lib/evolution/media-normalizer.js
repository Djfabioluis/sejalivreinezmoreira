const WRAPPERS = [
    "ephemeralMessage",
    "viewOnceMessage",
    "viewOnceMessageV2",
    "viewOnceMessageV2Extension",
    "documentWithCaptionMessage",
    "editedMessage",
];
/** Remove invólucros (ephemeral / viewOnce / documentWithCaption) mantendo a flag viewOnce. */
export function unwrapMessage(message) {
    let content = message;
    let isViewOnce = false;
    let guard = 0;
    while (content && typeof content === "object" && guard++ < 8) {
        const wrapper = WRAPPERS.find((w) => content[w]);
        if (!wrapper)
            break;
        if (wrapper.startsWith("viewOnce"))
            isViewOnce = true;
        content = content[wrapper]?.message ?? content[wrapper];
    }
    return { content: content ?? {}, isViewOnce };
}
function num(value) {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : undefined;
}
/**
 * Normaliza qualquer mensagem da Evolution em um formato único
 * com tipo, texto, legenda e metadados de mídia.
 */
export function normalizeIncomingMessage(message, keyId) {
    const { content, isViewOnce } = unwrapMessage(message);
    const base = {
        text: "",
        caption: "",
        isViewOnce,
        mediaId: keyId,
    };
    const pick = (node, messageType) => ({
        ...base,
        messageType,
        caption: typeof node?.caption === "string" ? node.caption : "",
        text: typeof node?.caption === "string" ? node.caption : "",
        mimeType: node?.mimetype ?? node?.mimeType ?? undefined,
        fileName: node?.fileName ?? node?.title ?? undefined,
        fileSize: num(node?.fileLength ?? node?.fileSize),
        duration: num(node?.seconds ?? node?.duration),
        mediaHash: typeof node?.fileSha256 === "string"
            ? node.fileSha256
            : node?.fileSha256
                ? String(node.fileSha256)
                : undefined,
    });
    if (content?.audioMessage)
        return pick(content.audioMessage, "audio");
    if (content?.imageMessage)
        return pick(content.imageMessage, "image");
    if (content?.videoMessage)
        return pick(content.videoMessage, "video");
    if (content?.stickerMessage)
        return pick(content.stickerMessage, "image");
    if (content?.documentMessage)
        return pick(content.documentMessage, "document");
    if (content?.ptvMessage)
        return pick(content.ptvMessage, "video");
    const text = (typeof content?.conversation === "string" && content.conversation) ||
        content?.extendedTextMessage?.text ||
        content?.buttonsResponseMessage?.selectedDisplayText ||
        content?.buttonsResponseMessage?.selectedButtonId ||
        content?.listResponseMessage?.title ||
        content?.listResponseMessage?.singleSelectReply?.selectedRowId ||
        content?.templateButtonReplyMessage?.selectedId ||
        content?.interactiveResponseMessage?.body?.text ||
        (typeof content?.text === "string" ? content.text : "") ||
        "";
    return { ...base, messageType: "text", text: String(text || "") };
}
/** Uma mensagem é processável se tiver texto ou mídia válida. */
export function hasProcessableContent(msg) {
    return msg.messageType !== "text" || Boolean(msg.text.trim());
}
