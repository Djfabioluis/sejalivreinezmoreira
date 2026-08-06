import { createServerFn } from "@tanstack/react-start";
import { PromotionService } from "./promotion-service.server";

export const testPromotionLookup = createServerFn({ method: "GET" })
  .handler(async () => {
    const promos = await PromotionService.getActivePromotions({
      channel: "WHATSAPP",
      category: "MECHAS"
    });
    return promos;
  });
