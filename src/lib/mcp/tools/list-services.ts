import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

export default defineTool({
  name: "list_services",
  title: "Listar serviços",
  description: "Lista serviços de uma unidade, com preço e duração.",
  inputSchema: { salon_id: z.number().describe("ID da unidade (salon).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ salon_id }) => {
    const cfg = getBempConfig();
    const data = await bempFetch(`${cfg.apiBase}/salons/${salon_id}/services`);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { services: data as unknown },
    };
  },
});
