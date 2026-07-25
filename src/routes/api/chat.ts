import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, stepCountIs, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import {
  bempFetch,
  getBempConfig,
  BEMP_WEBHOOK_BASE,
  type JsonValue,
} from "@/lib/bemp.server";

const SYSTEM_PROMPT = `Você é a secretária virtual de um consultório integrado à plataforma Bemp.
Sua função é conversar de forma humanizada, calorosa e objetiva, em português do Brasil,
para agendar consultas de pacientes.

REGRAS DE CONDUTA:
- Cumprimente com empatia. Chame o paciente pelo nome quando souber.
- Nunca invente serviços, profissionais, valores, durações ou horários. Consulte SEMPRE as ferramentas.
- Confirme cada informação coletada em uma frase curta antes de seguir.
- Antes de criar o agendamento, resuma tudo (nome, serviço, profissional, data/hora, valor, duração)
  e peça uma confirmação explícita ("posso confirmar?").
- Formate valores como R$ e horários em português (ex.: "quinta, 12/09 às 13h30").

FLUXO IDEAL:
1. Cumprimente e pergunte o nome.
2. Peça telefone (país/DDD/número). Se o paciente não informar país, assuma 55.
3. Liste unidades usando list_salons e pergunte qual escolhe.
4. Liste serviços da unidade (list_services) com valor e duração; ajude o paciente a escolher.
5. (Opcional) Liste profissionais (list_professionals). Se o paciente não tiver preferência, siga sem profissional.
6. Pergunte a data preferida (YYYY-MM-DD). Use list_slots para mostrar horários disponíveis.
7. Após escolha do horário, calcule o "end" somando a duração do serviço ao "start"
   e chame create_appointment.
8. Ao final, confirme o agendamento e ofereça mais ajuda.

Se algo falhar, explique com gentileza e sugira alternativas.`;

// Ferramentas expostas ao modelo — todas server-side com o token da Bemp.
const bempTools = {
  list_salons: tool({
    description: "Lista todas as unidades (salões) disponíveis na conta Bemp.",
    inputSchema: z.object({}),
    execute: async () => {
      const cfg = getBempConfig();
      return await bempFetch(`${cfg.apiBase}/salons`);
    },
  }),
  list_services: tool({
    description: "Lista serviços de uma unidade, com preço e duração.",
    inputSchema: z.object({
      salon_id: z.number().describe("ID numérico da unidade"),
    }),
    execute: async ({ salon_id }) => {
      const cfg = getBempConfig();
      return await bempFetch(`${cfg.apiBase}/salons/${salon_id}/services`);
    },
  }),
  list_professionals: tool({
    description: "Lista profissionais disponíveis para um serviço em uma unidade.",
    inputSchema: z.object({
      salon_id: z.number(),
      service_id: z.number(),
    }),
    execute: async ({ salon_id, service_id }) => {
      const cfg = getBempConfig();
      return await bempFetch(
        `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals`,
      );
    },
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
    execute: async ({ salon_id, service_id, professional_id, date }) => {
      const cfg = getBempConfig();
      const url = professional_id
        ? `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals/${professional_id}/slots/${date}`
        : `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/slots/${date}`;
      return await bempFetch(url);
    },
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
    execute: async (input) => {
      return await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
        method: "POST",
        body: JSON.stringify(input),
      });
    },
  }),
};

type ChatBody = { messages?: unknown };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: ChatBody;
        try {
          body = (await request.json()) as ChatBody;
        } catch {
          return new Response("Corpo inválido", { status: 400 });
        }
        if (!Array.isArray(body.messages)) {
          return new Response("messages é obrigatório", { status: 400 });
        }

        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("LOVABLE_API_KEY ausente", { status: 500 });

        const uiMessages = body.messages as UIMessage[];
        const gateway = createLovableAiGatewayProvider(key);
        const model = gateway("google/gemini-3.6-flash");

        try {
          const result = streamText({
            model,
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(uiMessages),
            tools: bempTools,
            stopWhen: stepCountIs(50),
          });
          return result.toUIMessageStreamResponse({ originalMessages: uiMessages });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Falha desconhecida";
          console.error("[chat] erro no streamText:", message);
          return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});

// Silencia o require de export default de rotas TSS
export default Route;

// Evita erro de tipo: tools registradas
type _ToolsShape = typeof bempTools;
type _AssertTools = _ToolsShape extends Record<string, unknown> ? true : false;
const _asserted: _AssertTools = true;
void _asserted;
export type ChatToolsShape = _ToolsShape;
export const CHAT_JSON_PLACEHOLDER: JsonValue | undefined = undefined;
