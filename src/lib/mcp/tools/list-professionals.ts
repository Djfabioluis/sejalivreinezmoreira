import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BempService } from "@/lib/bemp-service.server";

export default defineTool({
  name: "list_professionals",
  title: "Listar profissionais",
  description: "Lista profissionais disponíveis para um serviço em uma unidade.",
  inputSchema: {
    salon_id: z.number(),
    service_id: z.number(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ salon_id, service_id }) => {
    const data = await BempService.listProfessionals(salon_id, service_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { professionals: data as unknown },
    };
  },
});
