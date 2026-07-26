import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listAuditoriaSugestoes,
  type AuditoriaConversa,
  type RegistroSugestao,
} from "@/lib/suggestions.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  ClipboardList,
  Check,
  X,
  MessageSquare,
  Filter,
  ChevronDown,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/auditoria-sugestoes")({
  head: () => ({
    meta: [
      { title: "Auditoria de sugestões — Bemp" },
      {
        name: "description",
        content:
          "Veja todas as ofertas de serviços complementares feitas pela IA por conversa, incluindo motivos de recusa e descartes por limite ou elegibilidade.",
      },
    ],
  }),
  component: AuditoriaPage,
});

const MOTIVO_LABEL: Record<string, string> = {
  ja_agendado_hoje: "Já agendado hoje",
  limite_servico_atingido: "Limite do serviço/dia atingido",
  limite_cliente_atingido: "Limite do cliente/dia atingido",
  limite_conversa_atingido: "Limite por conversa atingido",
};

const STATUS_STYLE: Record<string, string> = {
  ofertado: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  aceito: "bg-green-500/10 text-green-700 border-green-500/30",
  recusado: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  descartado: "bg-muted text-muted-foreground border-border",
};

function AuditoriaPage() {
  const [dias, setDias] = useState(14);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [sandbox, setSandbox] = useState<"all" | "real" | "sandbox">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const params = useMemo(
    () => ({
      dias,
      phone: phone.trim() || undefined,
      status: status === "all" ? undefined : (status as "ofertado" | "aceito" | "recusado" | "descartado"),
      sandbox,
    }),
    [dias, phone, status, sandbox],
  );

  const query = useQuery({
    queryKey: ["auditoria-sugestoes", params],
    queryFn: () => listAuditoriaSugestoes({ data: params }),
  });

  const conversas = query.data?.conversas ?? [];

  const totais = useMemo(() => {
    return conversas.reduce(
      (acc, c) => {
        acc.ofertados += c.ofertados;
        acc.aceitos += c.aceitos;
        acc.recusados += c.recusados;
        acc.descartados += c.descartados;
        return acc;
      },
      { ofertados: 0, aceitos: 0, recusados: 0, descartados: 0 },
    );
  }, [conversas]);

  const taxaAceite =
    totais.ofertados > 0 ? Math.round((totais.aceitos / totais.ofertados) * 100) : null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-semibold">
                <ClipboardList className="h-5 w-5" /> Auditoria de sugestões
              </h1>
              <p className="text-sm text-muted-foreground">
                Ofertas de cross-sell feitas pela IA, agrupadas por conversa (telefone + dia).
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => query.refetch()} disabled={query.isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" /> Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-4">
            <div>
              <Label className="text-xs">Período (dias)</Label>
              <Input
                type="number"
                min={1}
                max={90}
                value={dias}
                onChange={(e) => setDias(Number(e.target.value) || 14)}
              />
            </div>
            <div>
              <Label className="text-xs">Telefone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="ex: 5511..."
              />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ofertado">Ofertado</SelectItem>
                  <SelectItem value="aceito">Aceito</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="descartado">Descartado (limite/elegibilidade)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ambiente</Label>
              <Select value={sandbox} onValueChange={(v) => setSandbox(v as "all" | "real" | "sandbox")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="real">Real</SelectItem>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-3 sm:grid-cols-5">
          <StatCard label="Conversas" value={conversas.length} />
          <StatCard label="Ofertados" value={totais.ofertados} tone="blue" />
          <StatCard label="Aceitos" value={totais.aceitos} tone="green" />
          <StatCard label="Recusados" value={totais.recusados} tone="orange" />
          <StatCard
            label="Descartados"
            value={totais.descartados}
            tone="muted"
            hint={taxaAceite != null ? `Aceite: ${taxaAceite}%` : undefined}
          />
        </div>

        {query.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : query.isError ? (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">
              Erro ao carregar auditoria: {(query.error as Error).message}
            </CardContent>
          </Card>
        ) : conversas.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Nenhuma sugestão encontrada no período selecionado.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversas.map((c) => (
              <ConversaCard
                key={c.key}
                conversa={c}
                open={!!expanded[c.key]}
                onToggle={() => setExpanded((s) => ({ ...s, [c.key]: !s[c.key] }))}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: number;
  tone?: "blue" | "green" | "orange" | "muted";
  hint?: string;
}) {
  const toneClass =
    tone === "blue"
      ? "text-blue-700"
      : tone === "green"
        ? "text-green-700"
        : tone === "orange"
          ? "text-orange-700"
          : tone === "muted"
            ? "text-muted-foreground"
            : "text-foreground";
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs uppercase text-muted-foreground">{label}</div>
        <div className={`text-2xl font-semibold ${toneClass}`}>{value}</div>
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function ConversaCard({
  conversa,
  open,
  onToggle,
}: {
  conversa: AuditoriaConversa;
  open: boolean;
  onToggle: () => void;
}) {
  const dataFormatada = new Date(`${conversa.data}T00:00:00`).toLocaleDateString("pt-BR");
  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40"
      >
        <div className="flex items-center gap-3">
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <div>
            <div className="font-medium">
              {conversa.phone || "Sem telefone"} · {dataFormatada}
            </div>
            <div className="text-xs text-muted-foreground">
              {conversa.eventos.length} evento(s) ·{" "}
              {new Date(conversa.primeiro_evento).toLocaleTimeString("pt-BR")} –{" "}
              {new Date(conversa.ultimo_evento).toLocaleTimeString("pt-BR")}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {conversa.sandbox ? (
            <Badge variant="outline" className="border-amber-500/40 text-amber-700">
              Sandbox
            </Badge>
          ) : null}
          <Badge variant="outline" className={STATUS_STYLE.ofertado}>
            {conversa.ofertados} ofertado
          </Badge>
          {conversa.aceitos > 0 ? (
            <Badge variant="outline" className={STATUS_STYLE.aceito}>
              <Check className="mr-1 h-3 w-3" /> {conversa.aceitos}
            </Badge>
          ) : null}
          {conversa.recusados > 0 ? (
            <Badge variant="outline" className={STATUS_STYLE.recusado}>
              <X className="mr-1 h-3 w-3" /> {conversa.recusados}
            </Badge>
          ) : null}
          {conversa.descartados > 0 ? (
            <Badge variant="outline" className={STATUS_STYLE.descartado}>
              {conversa.descartados} descartado
            </Badge>
          ) : null}
        </div>
      </button>
      {open ? (
        <CardContent className="border-t pt-4">
          <div className="space-y-2">
            {conversa.eventos.map((ev) => (
              <EventoRow key={ev.id} ev={ev} />
            ))}
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
}

function EventoRow({ ev }: { ev: RegistroSugestao }) {
  const motivoLabel =
    ev.status === "descartado" && ev.observacao
      ? MOTIVO_LABEL[ev.observacao] || ev.observacao
      : ev.observacao;
  return (
    <div className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={STATUS_STYLE[ev.status] || ""}>
            {ev.status}
          </Badge>
          <span className="font-medium">
            {ev.suggested_service_nome || `Serviço ${ev.suggested_service_id}`}
          </span>
        </div>
        {motivoLabel ? (
          <div className="mt-1 text-xs text-muted-foreground">Motivo: {motivoLabel}</div>
        ) : null}
        <div className="mt-1 text-xs text-muted-foreground">
          {ev.salon_id ? `Unidade ${ev.salon_id} · ` : ""}
          {ev.trigger_service_id ? `Gatilho ${ev.trigger_service_id}` : ""}
        </div>
      </div>
      <div className="whitespace-nowrap text-xs text-muted-foreground">
        {new Date(ev.created_at).toLocaleTimeString("pt-BR")}
      </div>
    </div>
  );
}
