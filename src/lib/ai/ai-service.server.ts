
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { getServerEnv } from "@/lib/config/env.server";

export const AI_MODELS = {
  chat: "google/gemini-1.5-flash",
  campaign: "google/gemini-1.5-flash",
  analysis: "google/gemini-1.5-flash",
  fast: "google/gemini-1.5-flash",
  smart: "google/gemini-1.5-pro"
} as const;

export function getAiProvider() {
  const env = getServerEnv();
  return createLovableAiGatewayProvider(env.LOVABLE_API_KEY);
}

export function getModelFor(purpose: keyof typeof AI_MODELS) {
  return AI_MODELS[purpose];
}
