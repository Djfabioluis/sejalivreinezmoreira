import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  bempFetch,
  BEMP_WEBHOOK_BASE,
  PROFESSIONAL_PREFERENCE_NOTE,
  tryUpdateBempScheduleNote,
  withProfessionalPreferenceNote,
} from "@/lib/bemp.server";

export default defineTool({
  name: "create_appointment",
  title: "Criar agendamento",
  description:
    "Cria um agendamento na Bemp. O 'end' deve ser 'start' + duração do serviço em minutos. Só chame após confirmação explícita do cliente.",
  inputSchema: {
    salon_id: z.number(),
    service_id: z.number(),
    professional_id: z.number().optional(),
    start: z.string().describe("ISO 8601, ex.: 2025-09-12T13:30:00.000-03:00"),
    end: z.string().describe("ISO 8601 correspondente ao término"),
    name: z.string(),
    phone_country_code: z.string(),
    phone_area_code: z.string(),
    phone_number: z.string(),
  },
  annotations: {
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  handler: async (input) => {
    const payload = withProfessionalPreferenceNote(input);
    const data = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_schedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (input.professional_id != null) {
      await tryUpdateBempScheduleNote(data, PROFESSIONAL_PREFERENCE_NOTE);
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { appointment: data as unknown },
    };
  },
});
