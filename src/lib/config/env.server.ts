
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

  const rawEnv = {
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    LOVABLE_API_KEY: process.env.LOVABLE_API_KEY,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_WEBHOOK_SECRET: process.env.EVOLUTION_WEBHOOK_SECRET,
    BEMP_DOMINIO: process.env.BEMP_DOMINIO,
    BEMP_TOKEN: process.env.BEMP_TOKEN,
    CRON_SECRET: process.env.CRON_SECRET,
    NODE_ENV: process.env.NODE_ENV,
    ENABLE_TEST_ENDPOINTS: process.env.ENABLE_TEST_ENDPOINTS,
    TEST_ENDPOINT_SECRET: process.env.TEST_ENDPOINT_SECRET,
  };

  const result = ServerEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    console.error("❌ Invalid environment variables:", JSON.stringify(result.error.format(), null, 2));
    // Don't throw for missing optional keys like CRON_SECRET during dev/build if not strictly needed
    // But for the cron route, it will check specifically.
    return (result.data || rawEnv) as any;
  }

  envCache = result.data;
  return result.data;
}
