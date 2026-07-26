import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getMyEntitlement } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";

export const Route = createFileRoute("/checkout/return")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Pagamento confirmado — Seja Livre" },
      { name: "description", content: "Sua assinatura foi confirmada." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"waiting" | "ready" | "timeout">("waiting");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const env = (() => {
      try {
        return getStripeEnvironment();
      } catch {
        return null;
      }
    })();
    if (!env) {
      setStatus("ready");
      return;
    }
    const tick = async () => {
      if (cancelled) return;
      attempts++;
      try {
        const ent = await getMyEntitlement({ data: { environment: env } });
        if (ent.active) {
          setStatus("ready");
          return;
        }
      } catch {
        // ignore transient errors, keep polling
      }
      if (attempts >= 15) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, 1500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          {status === "waiting" ? (
            <>
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-primary" />
              <h1 className="font-display text-3xl">Processando pagamento…</h1>
              <p className="text-muted-foreground">
                Estamos confirmando sua assinatura com o Stripe. Não feche esta página.
              </p>
            </>
          ) : status === "ready" ? (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
              <h1 className="font-display text-3xl">Assinatura confirmada!</h1>
              <p className="text-muted-foreground">
                {session_id
                  ? "Pagamento processado e acesso liberado."
                  : "Obrigado! Acesse o painel para começar."}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => navigate({ to: "/painel" })}>
                  Ir para o painel
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Voltar à página inicial</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="mx-auto h-16 w-16 text-amber-500" />
              <h1 className="font-display text-3xl">Pagamento recebido</h1>
              <p className="text-muted-foreground">
                Estamos demorando um pouco para liberar o acesso. Se em alguns
                minutos você não conseguir entrar no painel, atualize a página.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => navigate({ to: "/assinatura" })}>
                  Ver minha assinatura
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/">Voltar à página inicial</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
