import { describe, it, expect } from "vitest";
import { normalizeEvolutionEvent } from "../event-normalizer";
import { normalizeEvolutionMessages } from "../message-normalizer";
import { extractMessageText } from "../message-text";
import { normalizePhone, normalizeContactName, buildConversationKey } from "../contact";
import { normalizeConversationHistory } from "../history";

describe("Evolution Library Unit Tests", () => {
  describe("event-normalizer", () => {
    it("should normalize messages.upsert", () => {
      const payload = { event: "MESSAGES_UPSERT", instance: "test-inst" };
      const result = normalizeEvolutionEvent(payload);
      expect(result.event).toBe("messages.upsert");
      expect(result.instance).toBe("test-inst");
    });

    it("should normalize connection.update", () => {
      const payload = { event: "connection_update", instanceName: "test-inst" };
      const result = normalizeEvolutionEvent(payload);
      expect(result.event).toBe("connection.update");
      expect(result.instance).toBe("test-inst");
    });
  });

  describe("message-normalizer", () => {
    it("should handle payload.data as array", () => {
      const payload = { 
        instance: "inst1", 
        data: [{ key: { remoteJid: "123@s.whatsapp.net", id: "msg1" }, pushName: "User" }] 
      };
      const result = normalizeEvolutionMessages(payload, "http://localhost/api/webhook");
      expect(result).toHaveLength(1);
      expect(result[0].instance).toBe("inst1");
      expect(result[0].remoteJid).toBe("123@s.whatsapp.net");
    });

    it("should prioritize instance from query param", () => {
      const payload = { instance: "inst-payload", data: { key: { remoteJid: "123@s.whatsapp.net" } } };
      const result = normalizeEvolutionMessages(payload, "http://localhost/api/webhook?instance=inst-query");
      expect(result[0].instance).toBe("inst-query");
    });
  });

  describe("message-text", () => {
    it("should extract text from conversation", () => {
      expect(extractMessageText({ conversation: "hello" })).toBe("hello");
    });

    it("should extract text recursively from ephemeralMessage", () => {
      const msg = { ephemeralMessage: { message: { extendedTextMessage: { text: "secret" } } } };
      expect(extractMessageText(msg)).toBe("secret");
    });
  });

  describe("contact", () => {
    it("should normalize phone removing suffix", () => {
      expect(normalizePhone("5511999999999@s.whatsapp.net")).toBe("5511999999999");
      expect(normalizePhone("5511999999999@c.us")).toBe("5511999999999");
    });

    it("should build conversation key correctly", () => {
      expect(buildConversationKey("inst1", "1234@s.whatsapp.net")).toBe("inst1:1234");
    });
  });

  describe("history", () => {
    it("should normalize history and append current message if missing", () => {
      const raw = [{ id: "1", role: "user", message: { conversation: "hi" } }];
      const result = normalizeConversationHistory(raw, "new message");
      expect(result).toHaveLength(2);
      expect(result[1].parts[0].text).toBe("new message");
    });

    it("should deduplicate messages by ID", () => {
      const raw = [
        { id: "1", role: "user", message: { conversation: "hi" } },
        { id: "1", role: "user", message: { conversation: "hi" } }
      ];
      const result = normalizeConversationHistory(raw, "hi");
      expect(result).toHaveLength(1);
      expect(result[0].parts[0].text).toBe("hi");
    });
  });
});
