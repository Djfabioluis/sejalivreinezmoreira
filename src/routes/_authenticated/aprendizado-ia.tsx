import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Brain, Eraser, Loader2, RotateCcw, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  anonymizeMemory,
  forgetMemory,
  getLearningMetrics,
  getMemoryVersions,
  listAiFeedback,
  listCustomerMemories,
  listKnowledgeSuggestions,
  removeMemoryField,
  restoreMemory,
  reviewKnowledgeSuggestion,
  type CustomerMemoryListItem,
} from "@/lib/ai-learning.functions";

export const Route = createFileRoute("/_authenticated/aprendizado-ia")({
  head: () => ({
    meta: [
      { title: "Aprendizado da IA — Secretária virtual" },
      {
        name: "description",
        content:
          "Revise a memória de clientes, sugestões de conhecimento e qualidade das respostas da secretária virtual.",
      },
      { property: "og:title", content: "Aprendizado da IA — Secretária virtual" },
      {
        property: "og:description",
        content: "Painel de memória contínua, auditoria e sugestões aprendidas pela IA Julia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AprendizadoIaPage,
});

const FIELD_LABELS: Record<string, string> = {
  preferredName: "Como prefere ser chamada",
  preferredUnitId: "Unidade preferida",
  preferredServices: "Serviços preferidos",
  preferredProfessionals: "Profissionais preferidos",
  preferredDays: "Dias preferidos",
  preferredTimes: "Horários preferidos",
  restrictions: "Restrições",
  pendingTopics: "Pendências",
  importantNotes: "Observações",
};

function confidenceTone(score: number) {
  if (score >= 0.8) return "bg-primary/15 text-primary";
  if (score >= 0.5) return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  return "bg-muted text-muted-foreground";
}

function AprendizadoIaPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CustomerMemoryListItem | null>(null);
  const qc = useQueryClient();

  const fetchMemories = useServerFn(listCustomerMemories);
  const fetchSuggestions = useServerFn(listKnowledgeSuggestions);
  const fetchFeedback = useServerFn(listAiFeedback);
  const fetchMetrics = useServerFn(getLearningMetrics);
  const fetchVersions = useServerFn(getMemoryVersions);

  const doForget = useServerFn(forgetMemory);
  const doAnonymize = useServerFn(anonymizeMemory);
  const doRemoveField = useServerFn(removeMemoryField);
  const doRestore = useServerFn(restoreMemory);
  const doReview = useServerFn(reviewKnowledgeSuggestion);

  const memories = useQuery({
    queryKey: ["ai-memories", search],
    queryFn: () => fetchMemories({ data: { search: search || undefined, minConfidence: 0, limit: 100 } }),
    staleTime: 30_000,
  });
  const suggestions = useQuery({
    queryKey: ["ai-suggestions"],
    queryFn: () => fetchSuggestions({ data: { status: "all" } }),
    staleTime: 30_000,
  });
  const feedback = useQuery({
    queryKey: ["ai-feedback"],
    queryFn: () => fetchFeedback(),
    staleTime: 60_000,
  });
  const metrics = useQuery({
    queryKey: ["ai-learning-metrics"],
    queryFn: () => fetchMetrics(),
    staleTime: 120_000,
  });
  const versions = useQuery({
    queryKey: ["ai-memory-versions", selected?.id],
    enabled: !!selected?.id,
    queryFn: () => fetchVersions({ data: { memoryId: selected!.id } }),
  });

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["ai-memories"] });
    qc.invalidateQueries({ queryKey: ["ai-memory-versions"] });
  }

  const forgetMut = useMutation({
    mutationFn: (memoryId: string) => doForget({ data: { memoryId } }),
    onSuccess: () => {
      toast.success("Memória apagada para este cliente");
      setSelected(null);
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao apagar"),
  });

  const anonymizeMut = useMutation({
    mutationFn: (memoryId: string) => doAnonymize({ data: { memoryId } }),
    onSuccess: () => {
      toast.success("Memória anonimizada");
      setSelected(null);
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao anonimizar"),
  });

  const removeFieldMut = useMutation({
    mutationFn: (vars: { memoryId: string; field: string }) =>
      doRemoveField({ data: { memoryId: vars.memoryId, field: vars.field as never } }),
    onSuccess: () => {
      toast.success("Informação removida da memória");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  const restoreMut = useMutation({
    mutationFn: (versionId: string) => doRestore({ data: { versionId } }),
    onSuccess: () => {
      toast.success("Versão restaurada");
      invalidateAll();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao restaurar"),
  });

  const reviewMut = useMutation({
    mutationFn: (vars: { id: string; action: "approve" | "reject" | "publish" }) =>
      doReview({ data: vars }),
    onSuccess: () => {
      toast.success("Sugestão atualizada");
      qc.invalidateQueries({ queryKey: ["ai-suggestions"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao revisar"),
  });

  const rows = memories.data ?? [];
  const pendentes = useMemo(
    () => (suggestions.data ?? []).filter((s) => s.status === "pending").length,
    [suggestions.data],
  );

  const selectedFacts = selected
    ? ([
        ["preferredName", selected.preferred_name],
        ["preferredUnitId", selected.preferred_unit_id],
        ["preferredServices", selected.preferred_services],
        ["preferredProfessionals", selected.preferred_professionals],
        ["preferredDays", selected.preferred_days],
        ["preferredTimes", selected.preferred_times],
        ["restrictions", selected.restrictions],
        ["pendingTopics", selected.pending_topics],
        ["importantNotes", selected.important_notes],
      ] as Array<[string, string | string[] | null]>).filter(([, v]) =>
        Array.isArray(v) ? v.length > 0 : !!v,
      )
    : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <Brain className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold tracking-tight truncate">Aprendizado da IA</h1>
            <p className="text-xs text-muted-foreground truncate">
              Memória dos clientes, sugestões aprendidas e qualidade das respostas
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="memoria">
          <TabsList>
            <TabsTrigger value="memoria">Memória de clientes</TabsTrigger>
            <TabsTrigger value="sugestoes">
              Sugestões {pendentes > 0 ? `(${pendentes})` : ""}
            </TabsTrigger>
            <TabsTrigger value="qualidade">Qualidade</TabsTrigger>
          </TabsList>

          <TabsContent value="memoria" className="space-y-4 pt-4">
            <div className="flex items-center gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por telefone ou nome"
                className="max-w-sm"
                maxLength={120}
              />
              {memories.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            </div>

            {rows.length === 0 && !memories.isLoading ? (
              <Card className="p-6 text-sm text-muted-foreground">
                Nenhuma memória registrada ainda. A IA aprende conforme os atendimentos acontecem.
              </Card>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              {rows.map((m) => (
                <Card key={m.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {m.preferred_name || m.contact_name || "Cliente sem nome"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {m.anonymized_at ? "anonimizado" : m.phone_normalized}
                      </p>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs ${confidenceTone(m.confidence_score)}`}>
                      {Math.round((m.confidence_score ?? 0) * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {m.memory_summary || "Sem resumo consolidado."}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {m.preferred_services.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">
                        {s}
                      </Badge>
                    ))}
                    {m.preferred_professionals.slice(0, 2).map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px]">
                        {p}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-muted-foreground">
                      v{m.memory_version} ·{" "}
                      {m.last_interaction_at
                        ? new Date(m.last_interaction_at).toLocaleString("pt-BR")
                        : "sem interação"}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => setSelected(m)}>
                      Detalhes
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="sugestoes" className="space-y-3 pt-4">
            <p className="text-xs text-muted-foreground">
              Sugestões geradas automaticamente. Nada é publicado na base de conhecimento sem sua
              aprovação.
            </p>
            {(suggestions.data ?? []).length === 0 ? (
              <Card className="p-6 text-sm text-muted-foreground">Nenhuma sugestão no momento.</Card>
            ) : null}
            {(suggestions.data ?? []).map((s) => (
              <Card key={s.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.category} · {s.occurrence_count} ocorrência(s) ·{" "}
                      {Math.round((s.confidence_score ?? 0) * 100)}% de confiança
                    </p>
                  </div>
                  <Badge variant={s.status === "pending" ? "secondary" : "outline"}>{s.status}</Badge>
                </div>
                <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                  {s.suggested_content}
                </p>
                {s.evidence_summary ? (
                  <p className="text-[11px] text-muted-foreground italic">{s.evidence_summary}</p>
                ) : null}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={s.status !== "pending" || reviewMut.isPending}
                    onClick={() => reviewMut.mutate({ id: s.id, action: "approve" })}
                  >
                    Aprovar
                  </Button>
                  <Button
                    size="sm"
                    disabled={s.status !== "approved" || reviewMut.isPending}
                    onClick={() => reviewMut.mutate({ id: s.id, action: "publish" })}
                  >
                    Publicar na base
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={s.status === "rejected" || reviewMut.isPending}
                    onClick={() => reviewMut.mutate({ id: s.id, action: "reject" })}
                  >
                    Rejeitar
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="qualidade" className="space-y-3 pt-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Clientes com memória</p>
                <p className="text-2xl font-semibold">{metrics.data?.memories ?? "—"}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Memórias de alta confiança</p>
                <p className="text-2xl font-semibold">
                  {metrics.data?.memoriesWithHighConfidence ?? "—"}
                </p>
              </Card>
              <Card className="p-4">
                <p className="text-xs text-muted-foreground">Falhas da IA (14 dias)</p>
                <p className="text-2xl font-semibold">{metrics.data?.aiFailures ?? "—"}</p>
              </Card>
            </div>

            <Card className="p-4 space-y-2">
              <h2 className="text-sm font-semibold">Feedback registrado</h2>
              {(feedback.data ?? []).length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum feedback registrado ainda.</p>
              ) : (
                <ul className="space-y-2">
                  {(feedback.data ?? []).slice(0, 30).map((f) => (
                    <li key={f.id} className="text-xs border-b pb-2 last:border-0">
                      <span className="font-medium">{f.feedback_type}</span>
                      {f.rating ? ` · nota ${f.rating}` : ""} ·{" "}
                      {new Date(f.created_at).toLocaleString("pt-BR")}
                      {f.operator_notes ? (
                        <p className="text-muted-foreground">{f.operator_notes}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selected?.preferred_name || selected?.contact_name || "Memória do cliente"}
            </DialogTitle>
            <DialogDescription>
              Tudo o que a IA aprendeu com este cliente. Você pode corrigir, apagar ou anonimizar.
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="space-y-2">
                {selectedFacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Nenhum dado aprendido ainda.</p>
                ) : null}
                {selectedFacts.map(([field, value]) => {
                  const src = selected.field_sources?.[field];
                  return (
                    <div key={field} className="flex items-start justify-between gap-3 border-b pb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{FIELD_LABELS[field] ?? field}</p>
                        <p className="text-sm">
                          {Array.isArray(value) ? value.join(", ") : value}
                        </p>
                        {src ? (
                          <p className="text-[11px] text-muted-foreground">
                            origem: {src.source} · {Math.round((src.confidence ?? 0) * 100)}%
                          </p>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={removeFieldMut.isPending}
                        onClick={() => removeFieldMut.mutate({ memoryId: selected.id, field })}
                      >
                        <Eraser className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Histórico de alterações</h3>
                {(versions.data ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem versões anteriores.</p>
                ) : null}
                {(versions.data ?? []).map((v) => (
                  <div key={v.id} className="flex items-center justify-between gap-2 text-xs border-b pb-2">
                    <span>
                      v{v.version} · {v.change_reason ?? "alteração"} ·{" "}
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={restoreMut.isPending}
                      onClick={() => restoreMut.mutate(v.id)}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  variant="outline"
                  disabled={anonymizeMut.isPending}
                  onClick={() => anonymizeMut.mutate(selected.id)}
                >
                  <UserX className="h-4 w-4" /> Anonimizar
                </Button>
                <Button
                  variant="destructive"
                  disabled={forgetMut.isPending}
                  onClick={() => forgetMut.mutate(selected.id)}
                >
                  <Trash2 className="h-4 w-4" /> Esquecer cliente
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
