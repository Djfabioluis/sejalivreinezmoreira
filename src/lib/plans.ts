export type PlanKey = "starter" | "pro" | "business";
export type Cycle = "monthly" | "yearly";

export interface PlanDetails {
  id: string; // lookup_key in Stripe
  name: string;
  tagline: string;
  priceLabel: string;
  cycle: Cycle;
  tier: number;
  features: string[];
  highlight?: boolean;
}

export const PLAN_METADATA: Record<PlanKey, { name: string; tagline: string; features: string[]; highlight?: boolean; tier: number }> = {
  starter: {
    name: "Starter",
    tagline: "Para começar",
    tier: 1,
    features: [
      "1 número de WhatsApp",
      "Até 500 conversas/mês",
      "Agenda automática (Bemp)",
      "Base de conhecimento personalizável",
      "Confirmações e lembretes",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "Mais escolhido",
    tier: 2,
    features: [
      "Até 3 números de WhatsApp",
      "Até 2.000 conversas/mês",
      "Sugestões de cross-sell configuráveis",
      "Auditoria de sugestões",
      "Handoff humano com operadores",
      "Áudio bidirecional",
    ],
    highlight: true,
  },
  business: {
    name: "Business",
    tagline: "Para redes",
    tier: 3,
    features: [
      "Números e conversas ilimitados",
      "Multi-unidade",
      "Integrações avançadas",
      "Prioridade no suporte",
      "SLA dedicado",
    ],
  },
};

export const PLANS: PlanDetails[] = [
  { ...PLAN_METADATA.starter, id: "starter_monthly", priceLabel: "R$ 297", cycle: "monthly" },
  { ...PLAN_METADATA.starter, id: "starter_yearly", priceLabel: "R$ 2.970", cycle: "yearly" },
  { ...PLAN_METADATA.pro, id: "pro_monthly", priceLabel: "R$ 597", cycle: "monthly" },
  { ...PLAN_METADATA.pro, id: "pro_yearly", priceLabel: "R$ 5.970", cycle: "yearly" },
  { ...PLAN_METADATA.business, id: "business_monthly", priceLabel: "R$ 1.297", cycle: "monthly" },
  { ...PLAN_METADATA.business, id: "business_yearly", priceLabel: "R$ 12.970", cycle: "yearly" },
];

export function getPlanLabel(id: string): string {
  const plan = PLANS.find((p) => p.id === id);
  if (!plan) return id;
  return `${plan.name} · ${plan.cycle === "monthly" ? "Mensal" : "Anual"}`;
}
