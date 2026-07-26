import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
  return (
    <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center p-6">
      <Card>
        <CardContent className="space-y-4 p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-500" />
          <h1 className="font-display text-3xl">Assinatura confirmada!</h1>
          <p className="text-muted-foreground">
            {session_id
              ? "Seu pagamento foi processado. Já pode acessar o painel."
              : "Obrigado! Acesse o painel para começar."}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild>
              <Link to="/painel">Ir para o painel</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/">Voltar à página inicial</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
