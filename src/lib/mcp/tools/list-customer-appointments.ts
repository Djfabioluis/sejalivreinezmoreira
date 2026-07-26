import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bempFetch, BEMP_WEBHOOK_BASE } from "@/lib/bemp.server";

export default defineTool({
  name: "list_customer_appointments",
  title: "Buscar agendamentos por telefone",
  description: "Lista agendamentos de um cliente a partir do telefone (país + DDD + número).",
  inputSchema: {
    phone_country_code: z.string(),
    phone_area_code: z.string(),
    phone_number: z.string(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input) => {
    const data = await bempFetch(`${BEMP_WEBHOOK_BASE}/whatsapp_appointments`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { appointments: data as unknown },
    };
  },
});
