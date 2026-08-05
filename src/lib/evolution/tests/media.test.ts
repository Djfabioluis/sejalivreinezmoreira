import { describe, it, expect } from "vitest";
import { normalizeIncomingMessage, unwrapMessage, hasProcessableContent } from "../media-normalizer";
import { validateMediaMetadata } from "../media.server";
import { MEDIA_LIMITS } from "../media-types";
import { mediaPlaceholderText } from "../media-pipeline.server";

describe("normalizeIncomingMessage", () => {
  it("reconhece texto simples", () => {
    const r = normalizeIncomingMessage({ conversation: "oi" });
    expect(r.messageType).toBe("text");
    expect(r.text).toBe("oi");
  });

  it("reconhece extendedTextMessage", () => {
    const r = normalizeIncomingMessage({ extendedTextMessage: { text: "quero agendar" } });
    expect(r.messageType).toBe("text");
    expect(r.text).toBe("quero agendar");
  });

  it("reconhece áudio com duração e mime", () => {
    const r = normalizeIncomingMessage(
      { audioMessage: { mimetype: "audio/ogg; codecs=opus", seconds: 12, fileLength: "20480", fileSha256: "abc" } },
      "MSG1",
    );
    expect(r.messageType).toBe("audio");
    expect(r.duration).toBe(12);
    expect(r.fileSize).toBe(20480);
    expect(r.mediaId).toBe("MSG1");
    expect(r.mediaHash).toBe("abc");
  });

  it("reconhece imagem com legenda", () => {
    const r = normalizeIncomingMessage({
      imageMessage: { mimetype: "image/jpeg", caption: "Quero fazer assim." },
    });
    expect(r.messageType).toBe("image");
    expect(r.caption).toBe("Quero fazer assim.");
  });

  it("reconhece vídeo e documento", () => {
    expect(normalizeIncomingMessage({ videoMessage: { mimetype: "video/mp4" } }).messageType).toBe("video");
    expect(
      normalizeIncomingMessage({ documentMessage: { mimetype: "application/pdf", fileName: "a.pdf" } }).messageType,
    ).toBe("document");
  });

  it("desembrulha ephemeral e viewOnce", () => {
    const r = normalizeIncomingMessage({
      ephemeralMessage: { message: { viewOnceMessageV2: { message: { imageMessage: { mimetype: "image/png" } } } } },
    });
    expect(r.messageType).toBe("image");
    expect(r.isViewOnce).toBe(true);
  });

  it("desembrulha documentWithCaptionMessage", () => {
    const { content } = unwrapMessage({
      documentWithCaptionMessage: { message: { documentMessage: { mimetype: "application/pdf" } } },
    });
    expect(content.documentMessage).toBeTruthy();
  });

  it("não descarta mídia sem texto", () => {
    const r = normalizeIncomingMessage({ audioMessage: { mimetype: "audio/ogg" } });
    expect(hasProcessableContent(r)).toBe(true);
  });
});

describe("validateMediaMetadata", () => {
  it("aceita áudio dentro dos limites", () => {
    const r = validateMediaMetadata({
      messageType: "audio",
      text: "",
      caption: "",
      isViewOnce: false,
      mimeType: "audio/ogg; codecs=opus",
      fileSize: 1024,
      duration: 30,
    });
    expect(r.ok).toBe(true);
  });

  it("rejeita arquivo acima do limite", () => {
    const r = validateMediaMetadata({
      messageType: "video",
      text: "",
      caption: "",
      isViewOnce: false,
      mimeType: "video/mp4",
      fileSize: MEDIA_LIMITS.video.maxBytes + 1,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("size");
  });

  it("rejeita duração de áudio acima do limite", () => {
    const r = validateMediaMetadata({
      messageType: "audio",
      text: "",
      caption: "",
      isViewOnce: false,
      mimeType: "audio/ogg",
      duration: MEDIA_LIMITS.audio.maxDuration + 1,
    });
    expect(r.reason).toBe("duration");
  });

  it("rejeita mime não permitido", () => {
    const r = validateMediaMetadata({
      messageType: "document",
      text: "",
      caption: "",
      isViewOnce: false,
      mimeType: "application/x-msdownload",
    });
    expect(r.reason).toBe("mime");
  });

  it("bloqueia extensões perigosas", () => {
    const r = validateMediaMetadata({
      messageType: "document",
      text: "",
      caption: "",
      isViewOnce: false,
      mimeType: "application/pdf",
      fileName: "virus.exe",
    });
    expect(r.reason).toBe("extension");
  });
});

describe("mediaPlaceholderText", () => {
  it("mostra rótulo com legenda", () => {
    const text = mediaPlaceholderText({
      messageType: "image",
      text: "",
      caption: "Quero fazer assim.",
      isViewOnce: false,
    });
    expect(text).toContain("Imagem recebida");
    expect(text).toContain("Quero fazer assim.");
  });
});
