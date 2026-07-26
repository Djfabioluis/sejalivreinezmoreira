import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMySubscription,
  createPortalSession,
  changePlan,
} from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ArrowUpRight, ExternalLink, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assinatura")({
  head: () => ({
    meta: [{ title: "Minha assinatura — Seja Livre" }],
  }),
  component: AssinaturaPage,
});

const PLAN_LABEL: Record<string, string> = {
  starter_monthly: "Starter · Mensal",
  starter_yearly: "Starter · Anual",
  pro_monthly: "Pro · Mensal",
  pro_yearly: "Pro · Anual",
  business_monthly: "Business · Mensal",
  business_yearly: "Business · Anual",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento pendente",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  unpaid: "Não paga",
  paused: "Pausada",
};

const PLANS = [
  { id: "starter_monthly", name: "Starter", cycle: "Mensal", price: "R$ 297/mês", tier: 1 },
  { id: "starter_yearly", name: "Starter", cycle: "Anual", price: "R$ 2.970/ano", tier: 1 },
  { id: "pro_monthly", name: "Pro", cycle: "Mensal", price: "R$ 597/mês", tier: 2 },
  { id: "pro_yearly", name: "Pro", cycle: "Anual", price: "R$ 5.970/ano", tier: 2 },
  { id: "business_monthly", name: "Business", cycle: "Mensal", price: "R$ 1.297/mês", tier: 3 },
  { id: "business_yearly", name: "Business", cycle: "Anual", price: "R$ 12.970/ano", tier: 3 },
] as const;

function AssinaturaPage() {
  const qc = useQueryClient();
  const { data: sub, isLoading } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => getMySubscription(),
  });

  const portal = useMutation({
    mutationFn: async () => {
      const res = await createPortalSession({
        data: {
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/assinatura`,
        },
      });
      if ("error" in res) throw new Error(res.error);
      return res.url;
    },
    onSuccess: (url) => {
      window.open(url, "_blank");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl">Minha assinatura</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gerencie seu plano, atualize o cartão ou cancele quando quiser.
      </p>

      <div className="mt-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Carregando…
            </CardContent>
          </Card>
        ) : !sub ? (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma assinatura ativa</CardTitle>
              <CardDescription>
                Escolha um plano para começar a usar a Julia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link to="/">Ver planos</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>
                    {PLAN_LABEL[(sub.price_id as string) ?? ""] ?? (sub.price_id as string)}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Ambiente: {(sub.environment as string) === "sandbox" ? "teste" : "produção"}
                  </CardDescription>
                </div>
                <Badge
                  variant={
                    ["active", "trialing"].includes(sub.status as string)
                      ? "default"
                      : "secondary"
                  }
                >
                  {STATUS_LABEL[sub.status as string] ?? (sub.status as string)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {sub.current_period_end && (
                <p>
                  {sub.cancel_at_period_end
                    ? "Cancelada — acesso até "
                    : "Próxima cobrança em "}
                  <strong>
                    {new Date(sub.current_period_end as string).toLocaleDateString("pt-BR")}
                  </strong>
                </p>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  onClick={() => portal.mutate()}
                  disabled={portal.isPending}
                >
                  {portal.isPending ? "Abrindo…" : "Gerenciar assinatura"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Trocar de plano</Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O portal abre em uma nova aba com opções de cancelamento, troca de
                cartão e histórico de faturas.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
