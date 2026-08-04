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
      const payload = { instance: "inst-payload", data: { key: { remoteJid: "123@s.whatsapp.net", id: "msg-1" } } };
      const result = normalizeEvolutionMessages(payload, "http://localhost/api/webhook?instance=inst-query");
      expect(result[0].instance).toBe("inst-query");
    });

    it("should preserve key when payload.data contains key and message", () => {
      const payload = {
        event: "messages.upsert",
        instance: "agente-5541998803684",
        data: {
          key: {
            remoteJid: "5541999999999@s.whatsapp.net",
            fromMe: false,
            id: "REAL-PAYLOAD-001"
          },
          pushName: "Fábio Luís",
          message: {
            conversation: "Olá"
          },
          messageTimestamp: 1785850000
        }
      };

      const result = normalizeEvolutionMessages(
        payload,
        "https://example.com/api/public/whatsapp-evolution"
      );

      expect(result).toHaveLength(1);
      expect(result[0].instance).toBe("agente-5541998803684");
      expect(result[0].remoteJid).toBe("5541999999999@s.whatsapp.net");
      expect(result[0].messageId).toBe("REAL-PAYLOAD-001");
      expect(result[0].pushName).toBe("Fábio Luís");
      expect(result[0].message).toEqual({
        conversation: "Olá"
      });
    });

    it("should handle payload.data as array of messages", () => {
      const payload = {
        instance: "inst1",
        data: [
          { key: { remoteJid: "1@s.net", id: "m1" }, message: { conversation: "a" } },
          { key: { remoteJid: "2@s.net", id: "m2" }, message: { conversation: "b" } }
        ]
      };
      const result = normalizeEvolutionMessages(payload, "http://loc/api");
      expect(result).toHaveLength(2);
      expect(result[0].messageId).toBe("m1");
      expect(result[1].messageId).toBe("m2");
    });

    it("should handle payload.data.messages array", () => {
      const payload = {
        instance: "inst1",
        data: {
          messages: [
            { key: { remoteJid: "1@s.net", id: "m1" }, message: { conversation: "a" } }
          ]
        }
      };
      const result = normalizeEvolutionMessages(payload, "http://loc/api");
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m1");
    });

    it("should handle payload.messages array", () => {
      const payload = {
        instance: "inst1",
        messages: [
          { key: { remoteJid: "1@s.net", id: "m1" }, message: { conversation: "a" } }
        ]
      };
      const result = normalizeEvolutionMessages(payload, "http://loc/api");
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m1");
    });

    it("should handle full payload containing key and message", () => {
      const payload = {
        instance: "inst1",
        key: { remoteJid: "1@s.net", id: "m1" },
        message: { conversation: "a" }
      };
      const result = normalizeEvolutionMessages(payload, "http://loc/api");
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m1");
    });

    it("should handle fromMe as string 'true'", () => {
      const payload = {
        instance: "inst1",
        key: { remoteJid: "1@s.net", id: "m1", fromMe: "true" },
        message: { conversation: "a" }
      };
      const result = normalizeEvolutionMessages(payload, "http://loc/api");
      expect(result[0].fromMe).toBe(true);
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
      expect(normalizePhone("5541998803684@s.whatsapp.net")).toBe("5541998803684");
      expect(normalizePhone("5541998803684@c.us")).toBe("5541998803684");
    });

    it("should build conversation key correctly", () => {
      expect(buildConversationKey("inst1", "5541998803684@s.whatsapp.net")).toBe("inst1:5541998803684");
    });
  });

  describe("history", () => {
    it("should normalize history and include current message", () => {
      const raw = [{ id: "1", role: "user", messages: { id: "1", role: "user", parts: [{ text: "hi" }] } }];
      const result = normalizeConversationHistory(raw, "new message", "msg-current-id");
      expect(result).toHaveLength(2);
      expect(result[1].parts[0].text).toBe("new message");
    });

    it("should deduplicate messages by ID", () => {
      const raw = [
        { id: "msg1", role: "user", messages: { id: "msg1", role: "user", parts: [{ text: "hi" }] } }
      ];
      const result = normalizeConversationHistory(raw, "hi", "msg1");
      expect(result).toHaveLength(1);
      expect(result[0].parts[0].text).toBe("hi");
    });
  });
});