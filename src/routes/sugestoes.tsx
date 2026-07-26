import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listRegrasCrossSell,
  createRegraCrossSell,
  updateRegraCrossSell,
  deleteRegraCrossSell,
  listRegistrosSugestoes,
  type RegraCrossSell,
} from "@/lib/suggestions.functions";
import { listSalons, listServices } from "@/lib/bemp.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Pencil, Trash2, Sparkles, History } from "lucide-react";

export const Route = createFileRoute("/sugestoes")({
  head: () => ({
    meta: [
      { title: "Sugestões complementares — Bemp" },
      {
        name: "description",
        content: "Configure quais serviços complementares a IA deve oferecer em cada agendamento.",
      },
    ],
  }),
  component: SugestoesPage,
});

type AnyRec = Record<string, unknown>;
const asArray = (v: unknown): AnyRec[] => {
  if (Array.isArray(v)) return v as AnyRec[];
  if (v && typeof v === "object") {
    for (const k of ["data", "results", "items", "salons", "services"]) {
      const inner = (v as AnyRec)[k];
      if (Array.isArray(inner)) return inner as AnyRec[];
    }
  }
  return [];
};
const str = (v: unknown) => (v == null ? "" : String(v));

type FormState = {
  id?: string;
  salon_id: string;
  salon_nome: string;
  trigger_service_id: string;
  trigger_service_nome: string;
  suggested_service_id: string;
  suggested_service_nome: string;
  ordem: number;
  ativo: boolean;
  limite_por_servico_dia: string;
  limite_por_cliente_dia: string;
  limite_por_conversa: string;
  observacoes: string;
};

const EMPTY: FormState = {
  salon_id: "",
  salon_nome: "",
  trigger_service_id: "",
  trigger_service_nome: "",
  suggested_service_id: "",
  suggested_service_nome: "",
  ordem: 0,
  ativo: true,
  limite_por_servico_dia: "",
  limite_por_cliente_dia: "",
  limite_por_conversa: "1",
  observacoes: "",
};

function toNumOrNull(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function SugestoesPage() {
  const qc = useQueryClient();
  const regrasQ = useQuery({
    queryKey: ["cross-sell-regras"],
    queryFn: () => listRegrasCrossSell(),
  });
  const registrosQ = useQuery({
    queryKey: ["cross-sell-registros"],
    queryFn: () => listRegistrosSugestoes(),
    refetchInterval: 60_000,
  });
  const salonsQ = useQuery({ queryKey: ["salons"], queryFn: () => listSalons() });
  const salons = asArray(salonsQ.data);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [filterSalon, setFilterSalon] = useState("todos");
  const [filterTrigger, setFilterTrigger] = useState("");

  const servicesForSalon = useQuery({
    queryKey: ["services", form.salon_id],
    queryFn: () => listServices({ data: { salonId: form.salon_id } }),
    enabled: !!form.salon_id,
  });
  const services = asArray(servicesForSalon.data);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["cross-sell-regras"] });
    qc.invalidateQueries({ queryKey: ["cross-sell-registros"] });
  };

  type RegraPayload = {
    salon_id: string | null;
    salon_nome: string | null;
    trigger_service_id: string;
    trigger_service_nome: string | null;
    suggested_service_id: string;
    suggested_service_nome: string | null;
    ordem: number;
    ativo: boolean;
    limite_por_servico_dia: number | null;
    limite_por_cliente_dia: number | null;
    limite_por_conversa: number | null;
    observacoes: string | null;
  };

  const createMut = useMutation({
    mutationFn: (data: RegraPayload) => createRegraCrossSell({ data }),
    onSuccess: () => {
      toast.success("Regra criada");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: (data: RegraPayload & { id: string }) => updateRegraCrossSell({ data }),
    onSuccess: () => {
      toast.success("Regra atualizada");
      setOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteRegraCrossSell({ data: { id } }),
    onSuccess: () => {
      toast.success("Regra removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: (r: RegraCrossSell) =>
      updateRegraCrossSell({
        data: {
          id: r.id,
          salon_id: r.salon_id,
          salon_nome: r.salon_nome,
          trigger_service_id: r.trigger_service_id,
          trigger_service_nome: r.trigger_service_nome,
          suggested_service_id: r.suggested_service_id,
          suggested_service_nome: r.suggested_service_nome,
          ordem: r.ordem,
          ativo: !r.ativo,
          limite_por_servico_dia: r.limite_por_servico_dia,
          limite_por_cliente_dia: r.limite_por_cliente_dia,
          limite_por_conversa: r.limite_por_conversa,
          observacoes: r.observacoes,
        },
      }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  function openNew() {
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(r: RegraCrossSell) {
    setForm({
      id: r.id,
      salon_id: r.salon_id ?? "",
      salon_nome: r.salon_nome ?? "",
      trigger_service_id: r.trigger_service_id,
      trigger_service_nome: r.trigger_service_nome ?? "",
      suggested_service_id: r.suggested_service_id,
      suggested_service_nome: r.suggested_service_nome ?? "",
      ordem: r.ordem,
      ativo: r.ativo,
      limite_por_servico_dia: r.limite_por_servico_dia?.toString() ?? "",
      limite_por_cliente_dia: r.limite_por_cliente_dia?.toString() ?? "",
      limite_por_conversa: r.limite_por_conversa?.toString() ?? "",
      observacoes: r.observacoes ?? "",
    });
    setOpen(true);
  }
  function submit() {
    if (!form.trigger_service_id || !form.suggested_service_id) {
      toast.error("Selecione o serviço-gatilho e o complementar.");
      return;
    }
    const payload = {
      salon_id: form.salon_id || null,
      salon_nome: form.salon_nome || null,
      trigger_service_id: form.trigger_service_id,
      trigger_service_nome: form.trigger_service_nome || null,
      suggested_service_id: form.suggested_service_id,
      suggested_service_nome: form.suggested_service_nome || null,
      ordem: Number(form.ordem) || 0,
      ativo: form.ativo,
      limite_por_servico_dia: toNumOrNull(form.limite_por_servico_dia),
      limite_por_cliente_dia: toNumOrNull(form.limite_por_cliente_dia),
      limite_por_conversa: toNumOrNull(form.limite_por_conversa),
      observacoes: form.observacoes || null,
    };
    if (form.id) updateMut.mutate({ id: form.id, ...payload });
    else createMut.mutate(payload);
  }

  function pickService(id: string, target: "trigger" | "suggested") {
    const svc = services.find((s) => str(s.id) === id);
    const nome = svc ? str(svc.name) : "";
    if (target === "trigger") {
      setForm((f) => ({ ...f, trigger_service_id: id, trigger_service_nome: nome }));
    } else {
      setForm((f) => ({ ...f, suggested_service_id: id, suggested_service_nome: nome }));
    }
  }
  function pickSalon(id: string) {
    const s = salons.find((x) => str(x.id) === id);
    setForm((f) => ({
      ...f,
      salon_id: id,
      salon_nome: s ? str(s.name) : "",
      trigger_service_id: "",
      trigger_service_nome: "",
      suggested_service_id: "",
      suggested_service_nome: "",
    }));
  }

  const regras = regrasQ.data ?? [];
  const filtered = useMemo(() => {
    return regras.filter((r) => {
      if (filterSalon === "todos") {
        // nada
      } else if (filterSalon === "nenhuma") {
        if (r.salon_id) return false;
      } else if (r.salon_id !== filterSalon) {
        return false;
      }
      if (filterTrigger.trim()) {
        const t = filterTrigger.toLowerCase();
        const hay = `${r.trigger_service_nome ?? ""} ${r.trigger_service_id}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      return true;
    });
  }, [regras, filterSalon, filterTrigger]);

  const grouped = useMemo(() => {
    const map = new Map<string, RegraCrossSell[]>();
    for (const r of filtered) {
      const key = `${r.salon_id ?? ""}::${r.trigger_service_id}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => a.ordem - b.ordem);
    return Array.from(map.entries());
  }, [filtered]);

  const registros = registrosQ.data ?? [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Sugestões complementares
            </h1>
            <p className="text-sm text-muted-foreground">
              A IA usa essas regras para oferecer outros serviços antes de finalizar cada agendamento.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" /> Nova regra
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regras cadastradas</CardTitle>
            <CardDescription>Agrupadas por unidade e serviço-gatilho.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[240px_1fr]">
              <div>
                <Label>Unidade</Label>
                <Select value={filterSalon} onValueChange={setFilterSalon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="nenhuma">Sem unidade (vale para todas)</SelectItem>
                    {salons.map((s) => (
                      <SelectItem key={str(s.id)} value={str(s.id)}>
                        {str(s.name) || `#${str(s.id)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Filtrar por serviço-gatilho</Label>
                <Input
                  value={filterTrigger}
                  onChange={(e) => setFilterTrigger(e.target.value)}
                  placeholder="Nome ou ID"
                />
              </div>
            </div>

            {regrasQ.isLoading && <Skeleton className="h-24 w-full" />}
            {regrasQ.isError && (
              <p className="text-sm text-destructive">{(regrasQ.error as Error).message}</p>
            )}
            {!regrasQ.isLoading && grouped.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhuma regra ainda. Clique em <b>Nova regra</b> para começar.
              </p>
            )}

            <div className="space-y-4">
              {grouped.map(([key, rows]) => {
                const first = rows[0];
                return (
                  <div key={key} className="rounded-lg border">
                    <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
                      <div className="text-sm">
                        <span className="font-medium">
                          {first.trigger_service_nome || `Serviço #${first.trigger_service_id}`}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {first.salon_id ? first.salon_nome || `#${first.salon_id}` : "todas as unidades"}
                        </span>
                      </div>
                      <Badge variant="outline">{rows.length} sugestão(ões)</Badge>
                    </div>
                    <div className="divide-y">
                      {rows.map((r) => (
                        <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-8 text-center text-xs text-muted-foreground">
                            #{r.ordem}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {r.suggested_service_nome || `Serviço #${r.suggested_service_id}`}
                            </div>
                            <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                              {r.limite_por_servico_dia != null && (
                                <span>Máx {r.limite_por_servico_dia}/dia (serviço)</span>
                              )}
                              {r.limite_por_cliente_dia != null && (
                                <span>Máx {r.limite_por_cliente_dia}/dia (cliente)</span>
                              )}
                              {r.limite_por_conversa != null && (
                                <span>Máx {r.limite_por_conversa}/conversa</span>
                              )}
                              {r.observacoes && <span className="italic">"{r.observacoes}"</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={r.ativo}
                              onCheckedChange={() => toggleMut.mutate(r)}
                              aria-label="Ativa"
                            />
                            <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Remover a sugestão "${r.suggested_service_nome ?? r.suggested_service_id}"?`)) {
                                  deleteMut.mutate(r.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4" /> Últimas ofertas registradas
            </CardTitle>
            <CardDescription>
              Últimos 7 dias. Usado pela IA para respeitar os limites diários.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registrosQ.isLoading && <Skeleton className="h-16 w-full" />}
            {!registrosQ.isLoading && registros.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma oferta registrada ainda.</p>
            )}
            <div className="space-y-2">
              {registros.slice(0, 30).map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center gap-2 text-sm border rounded px-3 py-2"
                >
                  <Badge
                    variant={
                      r.status === "aceito"
                        ? "default"
                        : r.status === "recusado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                  <span className="font-medium">
                    {r.suggested_service_nome ?? `#${r.suggested_service_id}`}
                  </span>
                  {r.sandbox && <Badge variant="outline">simulação</Badge>}
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar regra" : "Nova regra de sugestão"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Unidade</Label>
                <Select
                  value={form.salon_id || "__all__"}
                  onValueChange={(v) => (v === "__all__" ? pickSalon("") : pickSalon(v))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todas as unidades</SelectItem>
                    {salons.map((s) => (
                      <SelectItem key={str(s.id)} value={str(s.id)}>
                        {str(s.name) || `#${str(s.id)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.ordem}
                  onChange={(e) => setForm((f) => ({ ...f, ordem: Number(e.target.value) || 0 }))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Serviço-gatilho</Label>
                <Select
                  value={form.trigger_service_id}
                  onValueChange={(v) => pickService(v, "trigger")}
                  disabled={!form.salon_id || servicesForSalon.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.salon_id ? "Selecionar" : "Escolha a unidade"} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={str(s.id)} value={str(s.id)}>
                        {str(s.name) || `#${str(s.id)}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Serviço que o cliente escolheu agendar.
                </p>
              </div>
              <div>
                <Label>Serviço complementar</Label>
                <Select
                  value={form.suggested_service_id}
                  onValueChange={(v) => pickService(v, "suggested")}
                  disabled={!form.salon_id || servicesForSalon.isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={form.salon_id ? "Selecionar" : "Escolha a unidade"} />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter((s) => str(s.id) !== form.trigger_service_id)
                      .map((s) => (
                        <SelectItem key={str(s.id)} value={str(s.id)}>
                          {str(s.name) || `#${str(s.id)}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Que a IA vai oferecer junto.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Limite por serviço/dia</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.limite_por_servico_dia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, limite_por_servico_dia: e.target.value }))
                  }
                  placeholder="sem limite"
                />
              </div>
              <div>
                <Label>Limite por cliente/dia</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.limite_por_cliente_dia}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, limite_por_cliente_dia: e.target.value }))
                  }
                  placeholder="sem limite"
                />
              </div>
              <div>
                <Label>Limite por conversa</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.limite_por_conversa}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, limite_por_conversa: e.target.value }))
                  }
                  placeholder="sem limite"
                />
              </div>
            </div>

            <div>
              <Label>Observações (opcional)</Label>
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
                placeholder="Ex.: só oferecer se sobrar horário na sequência."
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
              <Label htmlFor="ativo">Regra ativa</Label>
            </div>

            <p className="text-xs text-muted-foreground">
              Regra fixa de elegibilidade: a IA nunca sugere um serviço que o cliente já tem
              agendado no mesmo dia.
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={createMut.isPending || updateMut.isPending}>
              {form.id ? "Salvar" : "Criar regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
