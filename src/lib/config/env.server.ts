
import { z } from "zod";

export const ServerEnvSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  LOVABLE_API_KEY: z.string().min(1),
  EVOLUTION_API_URL: z.string().url().optional(),
  EVOLUTION_API_KEY: z.string().min(1).optional(),
  EVOLUTION_WEBHOOK_SECRET: z.string().min(1).optional(),
  BEMP_DOMINIO: z.string().min(1).optional(),
  BEMP_TOKEN: z.string().min(1).optional(),
  CRON_SECRET: z.string().min(1).optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  ENABLE_TEST_ENDPOINTS: z.string().transform(v => v === 'true').optional().default('false'),
  TEST_ENDPOINT_SECRET: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof ServerEnvSchema>;

let envCache: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (envCache) return envCache;

  const result = ServerEnvSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment variables");
  }

  envCache = result.data;
  return result.data;
}
