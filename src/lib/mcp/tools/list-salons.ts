import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { BempService } from "@/lib/bemp-service.server";

export default defineTool({
  name: "list_salons",
  title: "Listar unidades",
  description: "Lista todas as unidades (salões) da conta Bemp conectada.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const data = await BempService.listSalons();
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { salons: data as unknown },
    };
  },
});
