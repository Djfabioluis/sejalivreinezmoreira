import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { bempFetch, getBempConfig } from "@/lib/bemp.server";

export default defineTool({
  name: "list_salons",
  title: "Listar unidades",
  description: "Lista todas as unidades (salões) da conta Bemp conectada.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async () => {
    const cfg = await getBempConfig();
    const data = await bempFetch(`${cfg.apiBase}/salons`);
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { salons: data as unknown },
    };
  },
});
