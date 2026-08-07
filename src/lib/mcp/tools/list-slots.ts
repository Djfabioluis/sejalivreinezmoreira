import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BempService } from "@/lib/bemp-service.server";

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
    const data = await BempService.listAvailableSlots({
      salonId: salon_id,
      serviceId: service_id,
      date,
      professionalId: professional_id
    });
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { slots: data as unknown },
    };
  },
});
