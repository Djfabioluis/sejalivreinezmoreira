import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

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
    const cfg = getBempConfig();
    const data = await bempFetch(
      `${cfg.apiBase}/salons/${salon_id}/services/${service_id}/professionals`,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { professionals: data as unknown },
    };
  },
});
