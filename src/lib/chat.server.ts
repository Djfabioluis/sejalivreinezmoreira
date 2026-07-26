// Server-only. Shared AI-agent runner for /api/chat (web) and /api/public/whatsapp.
import { convertToModelMessages, streamText, generateText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { bempFetch, getBempConfig, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";

export const DEFAULT_SYSTEM_PROMPT = `Você é a secretária virtual de um consultório integrado à plataforma Bemp.
Sua função é conversar de forma humanizada, calorosa e objetiva, em português do Brasil,
para agendar consultas de pacientes.

REGRAS DE CONDUTA:
- Cumprimente com empatia. Chame o paciente pelo nome quando souber.
- Nunca invente serviços, profissionais, valores, durações ou horários. Consulte SEMPRE as ferramentas.
- Confirme cada informação coletada em uma frase curta antes de seguir.
- Antes de criar o agendamento, resuma tudo (nome, serviço, profissional, data/hora, valor, duração) e peça uma confirmação explícita ("posso confirmar?").
- Formate valores como R$ e horários em português (ex.: "quinta, 12/09 às 13h30").

FLUXO IDEAL:
1. Cumprimente e pergunte o nome.
2. Peça telefone (país/DDD/número). Se o paciente não informar país, assuma 55.
3. Liste unidades usando list_salons e pergunte qual escolhe.
4. Liste serviços da unidade (list_services) com valor e duração; ajude o paciente a escolher.
5. (Opcional) Liste profissionais (list_professionals). Se o paciente não tiver preferência, siga sem profissional.
6. Pergunte a data preferida (YYYY-MM-DD). Use list_slots para mostrar horários disponíveis.
7. Após escolha do horário, calcule o "end" somando a duração do serviço ao "start" e chame create_appointment.
8. Ao final, confirme o agendamento e ofereça mais ajuda.

Se algo falhar, explique com gentileza e sugira alternativas.`;

const SANDBOX_NOTE = `

MODO SANDBOX ATIVO:
- Nenhum agendamento será gravado no sistema real (Bemp).
- Ao chamar create_appointment, o sistema devolverá um comprovante SIMULADO.
- Ao final, deixe claro para o paciente que se trata de uma simulação de teste.`;

function safeTool<T>(label: string, fn: () => Promise<T>) {
  return fn().catch((err) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[chat] tool ${label} falhou:`, message);
    return { error: message } as const;
  });
}

function buildTools(sandbox: boolean) {
  const base = {
    list_salons: tool({
      description: "Lista todas as unidades (salões) disponíveis na conta Bemp.",
      inputSchema: z.object({}),
      execute: async () =>
        safeTool("list_salons", async () => {
          const cfg = getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons`);
        }),
    }),
    list_services: tool({
      description: "Lista serviços de uma unidade, com preço e duração.",
      inputSchema: z.object({ salon_id: z.number() }),
      execute: async ({ salon_id }) =>
        safeTool("list_services", async () => {
          const cfg = getBempConfig();
          return await bempFetch(`${cfg.apiBase}/salons/${salon_id}/services`);
        }),
    }),
    list_professionals: tool({
      description: "Lista profissionais disponíveis para um serviço em uma unidade.",
      inputSchema: z.object({ salon_id: z.number(), service_id: z.number() }),
      execute: async ({ salon_id, service_id }) =>
        safeTool("list_professionals", async () => {
          const cfg = getBempConfig();
          return await bempFetch(
            `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals`,
          );
        }),
    }),
    list_slots: tool({
      description:
        "Lista horários disponíveis. Passe professional_id apenas se o paciente escolheu um profissional específico.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        date: z.string().describe("Data no formato YYYY-MM-DD"),
      }),
      execute: async ({ salon_id, service_id, professional_id, date }) =>
        safeTool("list_slots", async () => {
          const cfg = getBempConfig();
          const url = professional_id
            ? `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals/${professional_id}/slots/${date}`
            : `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/slots/${date}`;
          return await bempFetch(url);
        }),
    }),
    create_appointment: tool({
      description:
        "Cria o agendamento na Bemp. Só chame após confirmação explícita do paciente. O 'end' deve ser o 'start' + duração do serviço em minutos.",
      inputSchema: z.object({
        salon_id: z.number(),
        service_id: z.number(),
        professional_id: z.number().optional(),
        start: z.string().describe("ISO 8601, ex.: 2025-09-12T13:30:00.000-03:00"),
        end: z.string().describe("ISO 8601 correspondente ao término"),
        name: z.string(),
        phone_country_code: z.string(),
        phone_area_code: z.string(),
        phone_number: z.string(),
      }),
      execute: async (input) =>
        safeTool("create_appointment", async () => {
          if (sandbox) {
            return {
              sandbox: true,
              simulated: true,
              id: `SIM-${Date.now()}`,
              status: "simulated",
              message:
                "Agendamento SIMULADO (modo sandbox). Nada foi gravado na Bemp.",
              appointment: input,
              created_at: new Date().toISOString(),
            };
          }
          return await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
            method: "POST",
            body: JSON.stringify(input),
          });
        }),
    }),
  };
  return base;
}

// Backwards-compat export (used by any older imports).
export const bempTools = buildTools(false);

function getModel() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente");
  const gateway = createLovableAiGatewayProvider(key);
  return gateway("google/gemini-3.6-flash");
}

export async function loadSystemPrompt(): Promise<string> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("base_conhecimento" as never)
      .select("conteudo")
      .eq("id", 1)
      .maybeSingle();
    const conteudo = (data as { conteudo?: string } | null)?.conteudo?.trim();
    return conteudo && conteudo.length > 0 ? conteudo : DEFAULT_SYSTEM_PROMPT;
  } catch (err) {
    console.error("[chat] falha ao carregar base de conhecimento:", err);
    return DEFAULT_SYSTEM_PROMPT;
  }
}

export type AgentOptions = { sandbox?: boolean };

function envSandbox(): boolean {
  return process.env.SANDBOX_MODE === "1" || process.env.SANDBOX_MODE === "true";
}

function currentDateNote(): string {
  const tz = "America/Sao_Paulo";
  const now = new Date();
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const humano = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(now);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
  }).format(now);
  return `\n\nCONTEXTO TEMPORAL (fuso America/Sao_Paulo):\n- Hoje é ${humano} (${iso}), ${hora}.\n- SEMPRE use o ano ${iso.slice(0, 4)} ao montar datas para list_slots e create_appointment.\n- Quando o paciente disser "amanhã", "sexta", "próxima semana" etc., calcule a partir de ${iso}.\n- Nunca use datas de anos anteriores; se o ano não for informado, assuma o ano corrente e, se a data já passou, use o próximo ano.`;
}

export async function streamAgent(uiMessages: UIMessage[], opts: AgentOptions = {}) {
  const sandbox = opts.sandbox === true || envSandbox();
  const system = (await loadSystemPrompt()) + currentDateNote() + (sandbox ? SANDBOX_NOTE : "");
  return streamText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(uiMessages),
    tools: buildTools(sandbox),
    stopWhen: stepCountIs(50),
  });
}

// Non-streaming run used by the WhatsApp webhook (needs the final text).
export async function runAgent(uiMessages: UIMessage[], opts: AgentOptions = {}): Promise<string> {
  const sandbox = opts.sandbox === true || envSandbox();
  const system = (await loadSystemPrompt()) + currentDateNote() + (sandbox ? SANDBOX_NOTE : "");
  const result = await generateText({
    model: getModel(),
    system,
    messages: await convertToModelMessages(uiMessages),
    tools: buildTools(sandbox),
    stopWhen: stepCountIs(50),
  });
  return result.text?.trim() || "Desculpe, tive um probleminha aqui. Pode repetir?";
}

