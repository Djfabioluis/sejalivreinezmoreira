import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

export default defineTool({
  name: "list_slots",
  title: "Listar horários disponíveis",
  description:
    "Lista horários disponíveis para um serviço em uma data (YYYY-MM-DD). Passe professional_id apenas se houver preferência.",
  inputSchema: {
    salon_id: z.number(),
    service_id: z.number(),
    date: z.string().describe("Data no formato YYYY-MM-DD"),
    professional_id: z.number().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ salon_id, service_id, date, professional_id }) => {
    const cfg = getBempConfig();
    const url = professional_id
      ? `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals/${professional_id}/slots/${date}`
      : `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/slots/${date}`;
    const data = await bempFetch(url);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { slots: data as unknown },
    };
  },
});
