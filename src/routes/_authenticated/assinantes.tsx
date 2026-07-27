import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { listAllSubscriptions, type AdminSubscriptionRow } from "@/lib/subscriptions-admin.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, CalendarClock, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/assinantes")({
  head: () => ({
    meta: [
      { title: "Assinantes — Seja Livre" },
      { name: "description", content: "Acompanhe assinantes, vencimentos, atrasos e cancelamentos." },
      { property: "og:title", content: "Assinantes — Seja Livre" },
      { property: "og:description", content: "Gestão de assinaturas dos usuários da secretaria virtual." },
    ],
  }),
  component: AssinantesPage,
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
  past_due: "Atrasada",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada",
  unpaid: "Não paga",
  paused: "Pausada",
};

type StatusFilter = "all" | "active" | "past_due" | "canceled" | "expiring";

function statusVariant(status: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!status) return "outline";
  if (["active", "trialing"].includes(status)) return "default";
  if (status === "past_due") return "destructive";
  if (["canceled", "unpaid", "incomplete_expired"].includes(status)) return "secondary";
  return "outline";
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function AssinantesPage() {
  const load = useServerFn(listAllSubscriptions);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => load(),
    refetchOnWindowFocus: false,
  });

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [env, setEnv] = useState<"all" | "live" | "sandbox">("all");

  const rows: AdminSubscriptionRow[] = data ?? [];

  const counts = useMemo(() => {
    const c = { total: rows.length, active: 0, past_due: 0, canceled: 0, expiring: 0 };
    for (const r of rows) {
      if (r.status === "active" || r.status === "trialing") c.active++;
      if (r.status === "past_due") c.past_due++;
      if (r.status === "canceled" || r.status === "unpaid" || r.status === "incomplete_expired") c.canceled++;
      const d = daysUntil(r.current_period_end);
      if (
        (r.status === "active" || r.status === "trialing") &&
        d !== null &&
        d >= 0 &&
        d <= 7
      )
        c.expiring++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (env !== "all" && r.environment !== env) return false;
      if (status === "active" && !["active", "trialing"].includes(r.status ?? "")) return false;
      if (status === "past_due" && r.status !== "past_due") return false;
      if (
        status === "canceled" &&
        !["canceled", "unpaid", "incomplete_expired"].includes(r.status ?? "")
      )
        return false;
      if (status === "expiring") {
        const d = daysUntil(r.current_period_end);
        if (!(["active", "trialing"].includes(r.status ?? "") && d !== null && d >= 0 && d <= 7))
          return false;
      }
      if (query) {
        const hay = `${r.email ?? ""} ${r.price_id ?? ""} ${r.stripe_customer_id ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [rows, q, status, env]);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="font-display text-3xl">Assinantes</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Acompanhe todos os assinantes, vencimentos, pagamentos atrasados e cancelamentos.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total" value={counts.total} icon={<Users2 />} />
        <StatCard label="Ativos" value={counts.active} tone="success" icon={<CheckCircle2 className="h-4 w-4" />} />
        <StatCard label="Atrasadas" value={counts.past_due} tone="warning" icon={<AlertTriangle className="h-4 w-4" />} />
        <StatCard label="Vencem em 7 dias" value={counts.expiring} icon={<CalendarClock className="h-4 w-4" />} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busque por e-mail, plano ou ID Stripe.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="past_due">Atrasadas</SelectItem>
              <SelectItem value="canceled">Canceladas</SelectItem>
              <SelectItem value="expiring">Vencem em 7 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={env} onValueChange={(v) => setEnv(v as "all" | "live" | "sandbox")}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ambientes</SelectItem>
              <SelectItem value="live">Produção</SelectItem>
              <SelectItem value="sandbox">Teste</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Assinaturas</CardTitle>
          <CardDescription>
            {isLoading ? "Carregando…" : `${filtered.length} de ${rows.length} registro(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma assinatura encontrada com os filtros atuais.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Assinante</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ambiente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Renovação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => {
                    const d = daysUntil(r.current_period_end);
                    const expiringSoon =
                      ["active", "trialing"].includes(r.status ?? "") &&
                      d !== null &&
                      d >= 0 &&
                      d <= 7;
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.email ?? "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.user_id.slice(0, 8)}…</div>
                        </TableCell>
                        <TableCell>{PLAN_LABEL[r.price_id ?? ""] ?? r.price_id ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(r.status)}>
                            {STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.environment === "live" ? "Produção" : "Teste"}
                        </TableCell>
                        <TableCell>
                          {r.current_period_end ? (
                            <div>
                              <div>{new Date(r.current_period_end).toLocaleDateString("pt-BR")}</div>
                              {d !== null && (
                                <div
                                  className={`text-xs ${
                                    d < 0
                                      ? "text-destructive"
                                      : expiringSoon
                                        ? "text-amber-600"
                                        : "text-muted-foreground"
                                  }`}
                                >
                                  {d < 0 ? `Venceu há ${-d}d` : `em ${d}d`}
                                </div>
                              )}
                            </div>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.cancel_at_period_end ? (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <XCircle className="h-3 w-3" /> Não renova
                            </span>
                          ) : (
                            <span className="text-muted-foreground">Automática</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Users2() {
  return <CheckCircle2 className="h-4 w-4 opacity-0" />;
}

function StatCard({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning";
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{label}</span>
          {icon}
        </div>
        <div
          className={`mt-1 text-2xl font-semibold ${
            tone === "warning" ? "text-amber-600" : tone === "success" ? "text-emerald-600" : ""
          }`}
        >
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
