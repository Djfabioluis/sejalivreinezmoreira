import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getPlanLabel, PLANS } from "@/lib/plans";
import { getStripeEnvironment } from "@/lib/stripe";


function AssinaturaPage() {
  const qc = useQueryClient();
  const env = getStripeEnvironment();
  const { data: sub, isLoading } = useQuery({
    queryKey: ["my-subscription", env],
    queryFn: () => getMySubscription({ data: { environment: env } }),
  });

  // Realtime: refetch on any change to this user's subscription rows.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) return;
      channel = supabase
        .channel(`subscriptions-${uid}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "subscriptions", filter: `user_id=eq.${uid}` },
          () => qc.invalidateQueries({ queryKey: ["my-subscription", env] }),
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [env, qc]);


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

  const swap = useMutation({
    mutationFn: async (newPriceId: string) => {
      const res = await changePlan({
        data: { newPriceId, environment: getStripeEnvironment() },
      });
      if ("error" in res) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      toast.success("Plano atualizado! Cobrança proporcional aplicada.");
      qc.invalidateQueries({ queryKey: ["my-subscription", env] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const currentPriceId = (sub?.price_id as string) ?? null;
  const periodEndMs = sub?.current_period_end
    ? new Date(sub.current_period_end as string).getTime()
    : 0;
  const inGrace =
    (sub?.status as string) === "canceled" && periodEndMs > Date.now();
  const canSwap = !!sub && (inGrace || sub.cancel_at_period_end || ["active", "trialing", "past_due"].includes((sub.status as string) ?? ""));




  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="font-display text-3xl">Minha assinatura</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gerencie seu plano, atualize o cartão ou cancele quando quiser.
      </p>

      <div className="mt-6">
        {sub && (sub.status as string) === "past_due" && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Pagamento pendente</p>
              <p className="mt-1">
                O Stripe está tentando cobrar seu cartão novamente. Seu acesso segue liberado enquanto isso.
                Atualize o cartão no portal para evitar a suspensão da assinatura.
              </p>
            </div>
          </div>
        )}
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
                  {portal.isPending ? "Abrindo…" : "Gerenciar cartão / cancelar"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                O portal abre em uma nova aba para trocar de cartão, ver faturas
                ou cancelar. Qualquer troca de plano abaixo é imediata, com
                cobrança proporcional da diferença.
              </p>
            </CardContent>
          </Card>
        )}

        {canSwap && (
          <div className="mt-8">
            <h2 className="font-display text-xl">
              {inGrace || sub?.cancel_at_period_end
                ? "Reativar escolhendo um plano"
                : "Trocar de plano"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {inGrace || sub?.cancel_at_period_end
                ? "Sua assinatura está marcada para encerrar. Escolha um plano abaixo para reativar imediatamente."
                : "O Stripe cobra a diferença proporcional na hora em qualquer troca (upgrade ou downgrade)."}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {PLANS.map((p) => {
                const isCurrent = p.id === currentPriceId && !(inGrace || sub?.cancel_at_period_end);
                const currentTier =
                  PLANS.find((x) => x.id === currentPriceId)?.tier ?? 0;
                const isUpgrade = p.tier > currentTier;
                const reactivate = inGrace || sub?.cancel_at_period_end;
                return (
                  <Card
                    key={p.id}
                    className={isCurrent ? "border-primary bg-primary/5" : ""}
                  >
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <p className="font-medium">
                          {p.name} · {p.cycle}
                        </p>
                        <p className="text-sm text-muted-foreground">{p.price}</p>
                      </div>
                      {isCurrent ? (
                        <Badge variant="secondary">
                          <Check className="mr-1 h-3 w-3" /> Atual
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant={isUpgrade || reactivate ? "default" : "outline"}
                          disabled={swap.isPending}
                          onClick={() => {
                            const msg = reactivate
                              ? `Reativar assinatura no plano ${p.name} ${p.cycle}?`
                              : isUpgrade
                                ? `Fazer upgrade para ${p.name} ${p.cycle}? Cobraremos a diferença proporcional agora.`
                                : `Trocar para ${p.name} ${p.cycle}? Cobraremos a diferença proporcional agora.`;
                            if (confirm(msg)) swap.mutate(p.id);
                          }}
                        >
                          {reactivate ? "Reativar" : isUpgrade ? "Fazer upgrade" : "Trocar"}
                          <ArrowUpRight className="ml-1 h-3 w-3" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}



      </div>
    </main>
  );
}
