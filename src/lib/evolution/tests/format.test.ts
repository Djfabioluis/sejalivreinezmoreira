import { describe, it, expect } from "vitest";
import { formatWhatsAppText } from "../trace";

describe("formatWhatsAppText", () => {
  it("deve converter negrito Markdown para negrito WhatsApp", () => {
    expect(formatWhatsAppText("Olá **Maria**")).toBe("Olá *Maria*");
  });

  it("deve converter itálico Markdown para itálico WhatsApp", () => {
    expect(formatWhatsAppText("Texto __itálico__")).toBe("Texto _itálico_");
  });

  it("deve lidar com asteriscos triplos", () => {
    expect(formatWhatsAppText("Muito ***importante***")).toBe("Muito *importante*");
  });

  it("deve preservar quebras de linha", () => {
    const text = "Linha 1\nLinha 2";
    expect(formatWhatsAppText(text)).toBe(text);
  });
});
