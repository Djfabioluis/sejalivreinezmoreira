import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BempService } from "@/lib/bemp-service.server";

export default defineTool({
  name: "list_services",
  title: "Listar serviços",
  description: "Lista serviços de uma unidade, com preço e duração.",
  inputSchema: { salon_id: z.number().describe("ID da unidade (salon).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ salon_id }) => {
    const data = await BempService.listServices(salon_id);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { services: data as unknown },
    };
  },
});
