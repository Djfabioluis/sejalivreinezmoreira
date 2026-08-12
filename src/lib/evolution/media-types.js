// Tipos e limites para mídia recebida pela Evolution API.
/** Limites configuráveis (bytes / segundos). */
export const MEDIA_LIMITS = {
    image: { maxBytes: 10 * 1024 * 1024, maxDuration: 0 },
    audio: { maxBytes: 25 * 1024 * 1024, maxDuration: 10 * 60 },
    video: { maxBytes: 50 * 1024 * 1024, maxDuration: 3 * 60 },
    document: { maxBytes: 20 * 1024 * 1024, maxDuration: 0 },
};
export const ALLOWED_MIME = {
    image: /^image\/(jpeg|jpg|png|webp|heic|heif)$/i,
    audio: /^audio\/(ogg|opus|mpeg|mp3|mp4|m4a|x-m4a|wav|x-wav|webm|aac|amr)$/i,
    video: /^video\/(mp4|3gpp|quicktime|webm)$/i,
    document: /^(application\/pdf|text\/plain|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document)$/i,
};
export const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|sh|msi|apk|scr|jar|com|pif|vbs|js|ps1|dll|zip|rar|7z|gz|tar)$/i;
export const OVERSIZE_REPLY = "Recebi o arquivo, mas ele é muito grande para análise automática. Pode enviar uma versão menor?";
export const MEDIA_FALLBACK_TEXT = {
    audio: "Recebi seu áudio, mas não consegui transcrevê-lo com segurança. Pode enviar novamente ou escrever a mensagem?",
    image: "Recebi sua imagem, mas não consegui analisar o conteúdo. Pode me explicar o que deseja fazer?",
    video: "Recebi o vídeo, mas não consegui processá-lo. Pode enviar uma imagem ou explicar o que deseja?",
    document: "Recebi seu arquivo, mas não consegui ler o conteúdo. Pode me explicar o que deseja fazer?",
};
export const MEDIA_PLACEHOLDER = {
    audio: "🎤 Áudio recebido",
    image: "🖼️ Imagem recebida",
    video: "🎬 Vídeo recebido",
    document: "📄 Documento recebido",
};
