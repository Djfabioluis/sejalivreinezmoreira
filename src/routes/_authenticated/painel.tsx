import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { VirtualRows, Pagination } from "@/components/virtual-rows";
import {
  listSalons,
  listServices,
  listProfessionals,
  listSlots,
  listCustomerAppointments,
  cancelAppointment,
} from "@/lib/bemp.functions";
import {
  listLeadsAssinatura,
  updateLeadStatus,
  type LeadAssinatura,
} from "@/lib/leads.functions";
import {
  listAgentes,
  criarAgente,
  removerAgente,
  gerarQrAgente,
  statusAgente,
  desconectarAgente,
} from "@/lib/agentes-whatsapp.functions";
import {
  getEvolutionSettings,
  saveEvolutionSettings,
} from "@/lib/evolution-config.functions";

import { checkEvolutionConfig } from "@/lib/evolution-check.functions";
import { verifyStripeSetup } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  listClientesAtendidos,
  listAtendimentosHumanos,
  updateAtendimentoStatus,
  type ClienteAtendido,
  type AtendimentoHumano,
} from "@/lib/atendimentos.functions";
import { listReagendamentos, type ReagendamentoHist } from "@/lib/reagendamentos.functions";
import { listEvolutionLogs } from "@/lib/evolution-logs.functions";
import { checkIsAdmin } from "@/lib/access.functions";

import { getWhatsAppPhoneNumber } from "@/lib/whatsapp.functions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calendar,
  Clock,
  User,
  Search,
  CheckCircle2,
  XCircle,
  Building2,
  Phone,
  MessageSquare,
  Users,
  QrCode,
  RefreshCw,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  PlugZap,
  Loader2,
  Info,
  AlertTriangle,
  UserCheck,
  LifeBuoy,
  CalendarClock,
  Activity,
  Scissors,
  Bot,
  DollarSign,
  BookOpen,
  Filter,
  Sparkles,
  ClipboardList,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { WhatsAppQr } from "@/components/whatsapp-qr";
import { SandboxToggle } from "@/components/sandbox-toggle";

function EvolutionConfigPanel() {
  const getSettings = useServerFn(getEvolutionSettings);
  const saveSettings = useServerFn(saveEvolutionSettings);
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [saving, setSaving] = useState(false);

  const q = useQuery({
    queryKey: ["evolution-settings"],
    queryFn: () => getSettings(),
  });

  useEffect(() => {
    if (q.data) {
      setUrl(q.data.url);
      setApiKey(q.data.apiKey);
      setWebhookSecret(q.data.webhookSecret || "");
    }
  }, [q.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveSettings({ data: { url, apiKey, webhookSecret } });
      toast.success("Configurações da Evolution API salvas!");
      queryClient.invalidateQueries({ queryKey: ["evolution-settings"] });
      queryClient.invalidateQueries({ queryKey: ["evolution-check"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  if (q.isLoading)
    return (
      <div className="p-8 text-center">
        <Loader2 className="animate-spin h-6 w-6 mx-auto" />
      </div>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlugZap className="h-5 w-5 text-primary" /> Configuração da Evolution API
        </CardTitle>
        <CardDescription>
          Gerencie a URL e a API Key do seu servidor Evolution. Estas configurações sobrescrevem
          as variáveis de ambiente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="space-y-4 max-w-2xl">
          <div className="space-y-2">
            <Label htmlFor="evo_url">URL da API (HTTPS)</Label>
            <Input
              id="evo_url"
              placeholder="https://sua-instancia.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
            <p className="text-[10px] text-muted-foreground">
              Ex: https://api.evolution.seudominio.com
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="evo_key">Global API Key</Label>
            <Input
              id="evo_key"
              type="password"
              placeholder="Sua Global API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="evo_webhook_secret">Webhook Secret (Opcional)</Label>
            <Input
              id="evo_webhook_secret"
              type="password"
              placeholder="Segredo para validar o webhook"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              Se configurado, o webhook exigirá este segredo no header x-webhook-secret.
            </p>
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Salvar Configurações
          </Button>
          {q.data?.source === "env" && (
            <Alert className="mt-4 bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertTitle>Usando Variáveis de Ambiente</AlertTitle>
              <AlertDescription>
                Atualmente o sistema está usando as credenciais configuradas no servidor (ENV). Ao
                salvar aqui, elas serão ignoradas em favor dos novos dados.
              </AlertDescription>
            </Alert>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function EvolutionLogsPanel() {
  const getLogs = useServerFn(listEvolutionLogs);
  const [instance, setInstance] = useState("");
  const [messageId, setMessageId] = useState("");
  const [status, setStatus] = useState<"all" | "success" | "error" | "received">("all");
  const [page, setPage] = useState(0);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["evolution-logs", instance, messageId, status, page],
    queryFn: () => getLogs({ data: { instance, messageId, status, page } }),
  });

  const logs = data?.logs || [];
  const total = data?.count || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Logs do Webhook Evolution
        </CardTitle>
        <CardDescription>
          Visualize e filtre os logs de processamento das mensagens enviadas pela Evolution API.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Instância</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por instância..."
                className="pl-9"
                value={instance}
                onChange={(e) => { setInstance(e.target.value); setPage(0); }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>ID da Mensagem</Label>
            <div className="relative">
              <MessageSquare className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar por messageId..."
                className="pl-9"
                value={messageId}
                onChange={(e) => { setMessageId(e.target.value); setPage(0); }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: any) => { setStatus(v); setPage(0); }}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="success">Sucesso</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button variant="outline" className="w-full" onClick={() => refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="py-20 text-center">
            <Loader2 className="animate-spin h-8 w-8 mx-auto text-muted-foreground" />
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{(error as Error).message}</AlertDescription>
          </Alert>
        ) : logs.length === 0 ? (
          <div className="py-20 text-center border rounded-lg border-dashed">
            <p className="text-muted-foreground">Nenhum log encontrado para estes filtros.</p>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-medium">Instância</th>
                  <th className="px-4 py-3 text-left font-medium">Evento</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Duração</th>
                  <th className="px-4 py-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{log.instance}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{log.event}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge 
                        className={
                          log.status === "success" ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20" : 
                          log.status === "error" ? "bg-red-500/10 text-red-500 hover:bg-red-500/20" : 
                          "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                        }
                      >
                        {log.status === "success" ? "Sucesso" : log.status === "error" ? "Erro" : "Recebido"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {log.duration_ms ? `${log.duration_ms}ms` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => {
                          const win = window.open("", "_blank");
                          if (win) {
                            win.document.write(`
                              <html>
                                <head><title>Log Detail - ${log.id}</title></head>
                                <body style="background:#0f172a; color:#f8fafc; font-family:monospace; padding:20px;">
                                  <h2>Log Detalhado</h2>
                                  <p><strong>ID:</strong> ${log.id}</p>
                                  <p><strong>Status:</strong> ${log.status}</p>
                                  <p><strong>Erro:</strong> ${log.error_detail || "Nenhum"}</p>
                                  <hr/>
                                  <h3>Payload:</h3>
                                  <pre style="background:#1e293b; padding:15px; border-radius:8px; overflow:auto;">
                                    ${JSON.stringify(log.payload, null, 2)}
                                  </pre>
                                </body>
                              </html>
                            `);
                          }
                        }}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination 
          page={page} 
          total={total} 
          pageSize={50} 
          onPageChange={setPage} 
        />
      </CardContent>
    </Card>
  );
}

const PAGE_SIZE = 30;


export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel Bemp — Agenda em tempo real" },
      {
        name: "description",
        content:
          "Painel para acompanhar unidades, serviços, profissionais e agendamentos integrados à plataforma Bemp.",
      },
      { property: "og:title", content: "Painel Bemp — Agenda em tempo real" },
      {
        property: "og:description",
        content: "Consulte serviços, valores, durações e agendamentos direto da API Bemp.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

// ---------- helpers ----------
type AnyRec = Record<string, unknown>;
const asArray = (v: unknown): AnyRec[] => {
  if (Array.isArray(v)) return v as AnyRec[];
  if (v && typeof v === "object") {
    for (const key of ["data", "results", "items", "salons", "services", "professionals", "slots", "appointments"]) {
      const inner = (v as AnyRec)[key];
      if (Array.isArray(inner)) return inner as AnyRec[];
    }
  }
  return [];
};
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown): number | null => {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return null;
};
const brl = (v: unknown) => {
  const n = num(v);
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};
const dur = (v: unknown) => {
  const n = num(v);
  if (n == null) return "—";
  if (n < 5) return `${n}h`;
  const h = Math.floor(n / 60);
  const m = n % 60;
  return h > 0 ? `${h}h${m ? ` ${m}min` : ""}` : `${m}min`;
};

// ---------- root ----------
function Dashboard() {
  const isAdminQ = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkIsAdmin(),
    staleTime: 5 * 60_000,
  });
  const isAdmin = isAdminQ.data?.isAdmin ?? false;

  const evolutionCheckQ = useQuery({
    queryKey: ["evolution-check"],
    queryFn: () => checkEvolutionCheck(),
  });

  async function checkEvolutionCheck() {
    return await checkEvolutionConfig();
  }

  const evoError = evolutionCheckQ.data?.isValid === false ? evolutionCheckQ.data.error : null;


  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border/40">
        <div className="space-y-2">
          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-3">
            Gestão Inteligente
          </Badge>
          <h2 className="text-5xl font-display tracking-tighter leading-none">Bom dia, Gestor</h2>
          <p className="text-muted-foreground text-lg font-medium">Aqui está o resumo estratégico da sua operação hoje.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">IA Health Score</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="h-2 w-24 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[98%]" />
              </div>
              <span className="text-sm font-bold text-emerald-600">98%</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium opacity-90">Agenda Hoje</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92%</div>
            <p className="text-xs opacity-70 mt-1">+4% em relação a ontem</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Prevista</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 12.480</div>
            <p className="text-xs text-emerald-500 font-medium mt-1">↑ 12.5% vs mês anterior</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm group">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              Recuperado Julia AI <Zap className="h-3 w-3 text-primary fill-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">R$ 3.250</div>
            <p className="text-xs text-muted-foreground mt-1">6 horários otimizados hoje</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Ocupação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">88%</div>
            <div className="mt-2 h-1.5 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-primary w-[88%]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {evoError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Configuração — Evolution API</AlertTitle>
            <AlertDescription>
              {evoError} Verifique as variáveis de ambiente do servidor.
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="catalogo" className="space-y-6">
          <div className="-mx-3 sm:mx-0 overflow-x-auto pb-1">
            <TabsList className="w-max min-w-full">
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              <TabsTrigger value="agenda">Agenda por cliente</TabsTrigger>
              <TabsTrigger value="horarios">Horários</TabsTrigger>
              <TabsTrigger value="leads">
                <Users className="h-4 w-4 mr-1" /> Leads
              </TabsTrigger>
              <TabsTrigger value="whatsapp">
                <QrCode className="h-4 w-4 mr-1" /> Agentes
              </TabsTrigger>
              <TabsTrigger value="config_evolution">
                <PlugZap className="h-4 w-4 mr-1" /> Config Evolution
              </TabsTrigger>
              <TabsTrigger value="atendidos" className="hidden sm:flex">
                <UserCheck className="h-4 w-4 mr-1" /> Atendidos
              </TabsTrigger>
              <TabsTrigger value="handoff" className="hidden sm:flex">
                <LifeBuoy className="h-4 w-4 mr-1" /> Triagem Humana
              </TabsTrigger>
              <TabsTrigger value="reagendamentos">
                <CalendarClock className="h-4 w-4 mr-1" /> Reagendamentos
              </TabsTrigger>
              {isAdmin && (
                <>
                  <TabsTrigger value="stripe_health">
                    <Activity className="h-4 w-4 mr-1" /> Saúde Stripe
                  </TabsTrigger>
                  <TabsTrigger value="evolution_logs">
                    <ClipboardList className="h-4 w-4 mr-1" /> Logs Evolution
                  </TabsTrigger>
                </>
              )}
            </TabsList>

          </div>

          <TabsContent value="catalogo">
            <CatalogoPanel />
          </TabsContent>
          <TabsContent value="agenda">
            <AgendaPanel />
          </TabsContent>
          <TabsContent value="horarios">
            <SlotsPanel />
          </TabsContent>
          <TabsContent value="leads">
            <LeadsPanel />
          </TabsContent>
          <TabsContent value="whatsapp">
            <WhatsAppPanel />
          </TabsContent>
          <TabsContent value="config_evolution">
            <EvolutionConfigPanel />
          </TabsContent>
          <TabsContent value="atendidos">
            <ClientesAtendidosPanel />
          </TabsContent>
          <TabsContent value="handoff">
            <AtendimentoHumanoPanel />
          </TabsContent>
          <TabsContent value="reagendamentos">
            <ReagendamentosPanel />
          </TabsContent>
          {isAdmin && (
            <>
              <TabsContent value="stripe_health">
                <StripeHealthPanel />
              </TabsContent>
              <TabsContent value="evolution_logs">
                <EvolutionLogsPanel />
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}

// ---------- Catálogo (Unidades → Serviços → Profissionais) ----------
function CatalogoPanel() {
  const salonsQ = useQuery({
    queryKey: ["salons"],
    queryFn: () => listSalons(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const salons = asArray(salonsQ.data);

  const [salonId, setSalonId] = useState<string>("");

  const activeSalon = useMemo(
    () => salons.find((s) => str(s.id) === salonId) ?? salons[0],
    [salons, salonId],
  );
  const activeId = activeSalon ? str(activeSalon.id) : "";

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4" /> Unidades
          </CardTitle>
          <CardDescription>Selecione uma unidade</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {salonsQ.isLoading && <Skeleton className="h-9 w-full" />}
          {salonsQ.isError && (
            <p className="text-sm text-destructive">{(salonsQ.error as Error).message}</p>
          )}
          {salons.map((s) => {
            const id = str(s.id);
            const isActive = id === (activeId || "");
            return (
              <button
                key={id}
                onClick={() => setSalonId(id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent"
                }`}
              >
                <div className="font-medium truncate">{str(s.name) || `Unidade #${id}`}</div>
                {s.address ? (
                  <div className={`text-xs truncate ${isActive ? "opacity-80" : "text-muted-foreground"}`}>
                    {str(s.address)}
                  </div>
                ) : null}
              </button>
            );
          })}
          {!salonsQ.isLoading && salons.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhuma unidade encontrada.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        {activeSalon ? <ServicosCard salonId={activeId} /> : null}
      </div>
    </div>
  );
}

function ServicosCard({ salonId }: { salonId: string }) {
  const q = useQuery({
    queryKey: ["services", salonId],
    queryFn: () => listServices({ data: { salonId } }),
    enabled: !!salonId,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  const services = asArray(q.data);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scissors className="h-4 w-4" /> Serviços
          </CardTitle>
          <CardDescription>Valores e duração conforme a Bemp</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => q.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {q.isLoading && (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}
        {q.isError && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
        {!q.isLoading && services.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum serviço cadastrado.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => {
            const id = str(s.id);
            return (
              <div key={id} className="rounded-lg border p-4">
                <div className="font-medium">{str(s.name) || `Serviço #${id}`}</div>
                {s.description ? (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{str(s.description)}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <DollarSign className="h-3 w-3" /> {brl(s.price ?? s.value ?? s.amount)}
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" /> {dur(s.duration ?? s.duration_minutes)}
                  </Badge>
                </div>
                <ProfissionaisMini salonId={salonId} serviceId={id} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ProfissionaisMini({ salonId, serviceId }: { salonId: string; serviceId: string }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["professionals", salonId, serviceId],
    queryFn: () => listProfessionals({ data: { salonId, serviceId } }),
    enabled: open,
  });
  const pros = asArray(q.data);
  return (
    <div className="mt-3 border-t pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-primary hover:underline"
      >
        {open ? "Ocultar profissionais" : "Ver profissionais"}
      </button>
      {open && (
        <div className="mt-2 flex flex-wrap gap-1">
          {q.isLoading && <Skeleton className="h-6 w-24" />}
          {pros.map((p) => (
            <Badge key={str(p.id)} variant="outline">
              {str(p.name) || `#${str(p.id)}`}
            </Badge>
          ))}
          {!q.isLoading && pros.length === 0 && (
            <span className="text-xs text-muted-foreground">Sem profissionais.</span>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Agenda por cliente ----------
function AgendaPanel() {
  const [country, setCountry] = useState("55");
  const [area, setArea] = useState("");
  const [number, setNumber] = useState("");
  const mut = useMutation({
    mutationFn: async (input: { phoneCountry: string; phoneArea: string; phoneNumber: string }) =>
      listCustomerAppointments({ data: input }),
  });
  const appointments = asArray(mut.data);
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [mut.data]);
  const pageItems = appointments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4" /> Consultar agendamentos do cliente
        </CardTitle>
        <CardDescription>Informe o telefone conforme cadastrado no WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-[100px_120px_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            mut.mutate({ phoneCountry: country, phoneArea: area, phoneNumber: number });
          }}
        >
          <div>
            <Label htmlFor="cc">País</Label>
            <Input id="cc" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ac">DDD</Label>
            <Input id="ac" value={area} onChange={(e) => setArea(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="num">Número</Label>
            <Input id="num" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="self-end">
            <Button type="submit" disabled={mut.isPending || !area || !number}>
              <Search className="h-4 w-4 mr-2" />
              Buscar
            </Button>
          </div>
        </form>

        {mut.isError && (
          <p className="mt-4 text-sm text-destructive">{(mut.error as Error).message}</p>
        )}

        <div className="mt-6 space-y-2">
          {mut.isSuccess && appointments.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum agendamento aberto para este cliente.</p>
          )}
          {appointments.length > 0 && (
            <>
              <VirtualRows
                items={pageItems}
                estimateSize={72}
                maxHeight={520}
                getKey={(a, i) => str(a.id) || i}
                renderItem={(a) => (
                  <div className="rounded-lg border p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {str(a.service_name || a.service || "Agendamento")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {str(a.start || a.date || a.datetime)} {a.professional_name ? `• ${str(a.professional_name)}` : ""}
                      </div>
                    </div>
                    <Badge variant="secondary">#{str(a.id)}</Badge>
                  </div>
                )}
              />
              <Pagination page={page} pageSize={PAGE_SIZE} total={appointments.length} onPageChange={setPage} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- Slots ----------
function SlotsPanel() {
  const salonsQ = useQuery({ queryKey: ["salons"], queryFn: () => listSalons() });
  const salons = asArray(salonsQ.data);
  const [salonId, setSalonId] = useState<string>("");
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));

  const servicesQ = useQuery({
    queryKey: ["services", salonId],
    queryFn: () => listServices({ data: { salonId } }),
    enabled: !!salonId,
  });
  const services = asArray(servicesQ.data);

  const slotsQ = useQuery({
    queryKey: ["slots", salonId, serviceId, date],
    queryFn: () => listSlots({ data: { salonId, serviceId, date } }),
    enabled: !!salonId && !!serviceId && !!date,
  });
  const slots = asArray(slotsQ.data);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" /> Horários disponíveis
        </CardTitle>
        <CardDescription>Consulte a agenda de um serviço em uma data.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label>Unidade</Label>
            <Select value={salonId} onValueChange={(v) => { setSalonId(v); setServiceId(""); }}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {salons.map((s) => (
                  <SelectItem key={str(s.id)} value={str(s.id)}>
                    {str(s.name) || `#${str(s.id)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Serviço</Label>
            <Select value={serviceId} onValueChange={setServiceId} disabled={!salonId}>
              <SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={str(s.id)} value={str(s.id)}>
                    {str(s.name) || `#${str(s.id)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {slotsQ.isError && (
          <p className="text-sm text-destructive">{(slotsQ.error as Error).message}</p>
        )}
        {slotsQ.isLoading && <Skeleton className="h-20 w-full" />}
        {slotsQ.isSuccess && (
          <div className="flex flex-wrap gap-2">
            {slots.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum horário disponível.</p>
            )}
            {slots.map((s, i) => (
              <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                {str(s.start || s.time || s.hour || s)}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- WhatsApp QR ----------
function WhatsAppPanel() {
  const q = useQuery({
    queryKey: ["whatsapp-phone"],
    queryFn: () => getWhatsAppPhoneNumber(),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <QrCode className="h-4 w-4" /> Conectar WhatsApp
        </CardTitle>
        <CardDescription>
          Escaneie o QR code ou clique no link para iniciar a conversa com a secretária virtual.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {q.isLoading && <Skeleton className="h-64 w-64" />}
        {q.isError && (
          <p className="text-sm text-destructive">{(q.error as Error).message}</p>
        )}
        {q.isSuccess && (
          q.data.ok ? (
            <div className="space-y-4">
              <WhatsAppQr link={q.data.link} />
              <div className="space-y-1">
                <p className="text-sm font-medium">{q.data.formatted}</p>
                <a
                  href={q.data.link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {q.data.link}
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                WhatsApp Cloud API ainda não configurado.
              </p>
              <p className="text-xs text-muted-foreground">{q.data.error}</p>
            </div>
          )
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Leads de Assinatura ----------
const STATUS_LABEL: Record<string, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  convertido: "Convertido",
  descartado: "Descartado",
};
const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  novo: "default",
  em_atendimento: "secondary",
  convertido: "outline",
  descartado: "destructive",
};

function formatPhone(l: LeadAssinatura) {
  const cc = l.phone_country_code ?? "";
  const ac = l.phone_area_code ?? "";
  const nu = l.phone_number ?? "";
  if (!cc && !ac && !nu) return "—";
  return `+${cc} (${ac}) ${nu}`.trim();
}

function LeadsPanel() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["leads-assinatura"],
    queryFn: () => listLeadsAssinatura(),
    refetchInterval: 30_000,
  });
  const [status, setStatus] = useState<string>("todos");
  const [origem, setOrigem] = useState<string>("todos");
  const [search, setSearch] = useState("");

  const leads = (q.data ?? []) as LeadAssinatura[];
  const origens = useMemo(
    () => Array.from(new Set(leads.map((l) => l.origem).filter(Boolean))),
    [leads],
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (status !== "todos" && l.status !== status) return false;
      if (origem !== "todos" && l.origem !== origem) return false;
      if (!term) return true;
      const hay = [
        l.nome,
        l.email,
        l.cpf,
        l.plano_nome,
        l.phone_area_code,
        l.phone_number,
        l.observacoes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [leads, status, origem, search]);

  const mut = useMutation({
    mutationFn: (input: { id: string; status: "novo" | "em_atendimento" | "convertido" | "descartado" }) =>
      updateLeadStatus({ data: input }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["leads-assinatura"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: leads.length };
    for (const l of leads) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" /> Leads de assinatura
          </CardTitle>
          <CardDescription>
            Interesses coletados pela IA. Atualize o status conforme o atendimento.
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={() => q.refetch()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px]">
          <div>
            <Label htmlFor="lead-search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="lead-search"
                className="pl-8"
                placeholder="Nome, email, CPF, plano, telefone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos ({counts.todos ?? 0})</SelectItem>
                <SelectItem value="novo">Novo ({counts.novo ?? 0})</SelectItem>
                <SelectItem value="em_atendimento">Em atendimento ({counts.em_atendimento ?? 0})</SelectItem>
                <SelectItem value="convertido">Convertido ({counts.convertido ?? 0})</SelectItem>
                <SelectItem value="descartado">Descartado ({counts.descartado ?? 0})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Origem</Label>
            <Select value={origem} onValueChange={setOrigem}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {origens.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3 w-3" />
          Mostrando {filtered.length} de {leads.length}
        </div>

        {q.isLoading && <Skeleton className="h-32 w-full" />}
        {q.isError && (
          <p className="text-sm text-destructive">{(q.error as Error).message}</p>
        )}
        {!q.isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum lead encontrado.</p>
        )}

        <LeadsList
          items={filtered}
          onStatusChange={(id, status) => mut.mutate({ id, status })}
        />
      </CardContent>
    </Card>
  );
}

function LeadsList({
  items,
  onStatusChange,
}: {
  items: LeadAssinatura[];
  onStatusChange: (id: string, status: "novo" | "em_atendimento" | "convertido" | "descartado") => void;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items]);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  if (items.length === 0) return null;
  return (
    <div>
      <VirtualRows
        items={pageItems}
        estimateSize={180}
        maxHeight={640}
        getKey={(l) => l.id}
        renderItem={(l) => (
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{l.nome}</span>
                  <Badge variant={STATUS_VARIANT[l.status] ?? "secondary"}>
                    {STATUS_LABEL[l.status] ?? l.status}
                  </Badge>
                  {l.sandbox && <Badge variant="outline">simulação</Badge>}
                  <Badge variant="outline">{l.origem}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <Select
                value={l.status}
                onValueChange={(v) =>
                  onStatusChange(l.id, v as "novo" | "em_atendimento" | "convertido" | "descartado")
                }
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="novo">Novo</SelectItem>
                  <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                  <SelectItem value="convertido">Convertido</SelectItem>
                  <SelectItem value="descartado">Descartado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Plano: </span>
                {l.plano_nome ?? "—"}
                {l.plano_id ? <span className="text-muted-foreground"> (#{l.plano_id})</span> : null}
              </div>
              <div>
                <span className="text-muted-foreground">Telefone: </span>
                {formatPhone(l)}
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                {l.email ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">CPF: </span>
                {l.cpf ?? "—"}
              </div>
            </div>

            {l.observacoes && (
              <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">{l.observacoes}</p>
            )}
          </div>
        )}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
    </div>
  );
}




// ---------- Clientes atendidos (histórico de conversas) ----------
function ClientesAtendidosPanel() {
  const [q, setQ] = useState("");
  const query = useQuery({
    queryKey: ["clientes-atendidos"],
    queryFn: () => listClientesAtendidos(),
    refetchInterval: 60_000,
  });

  const rows: ClienteAtendido[] = query.data ?? [];
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        r.phone.toLowerCase().includes(t) ||
        (r.ultima_mensagem ?? "").toLowerCase().includes(t),
    );
  }, [rows, q]);

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Clientes atendidos pela secretária
            </CardTitle>
            <CardDescription>
              Todas as conversas iniciadas pela IA no WhatsApp e no chat da web.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${query.isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar por telefone ou mensagem…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma conversa registrada ainda.</p>
        ) : (
          <AtendidosList items={filtered} />
        )}
      </CardContent>
    </Card>
  );
}

function AtendidosList({ items }: { items: ClienteAtendido[] }) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items]);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <div>
      <VirtualRows
        items={pageItems}
        estimateSize={72}
        maxHeight={640}
        getKey={(c) => c.phone}
        renderItem={(c) => (
          <div className="rounded-lg border bg-card p-3 flex flex-col gap-1 sm:grid sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{c.phone}</span>
                <Badge variant="secondary" className="ml-1">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {c.total_mensagens} msg
                </Badge>
              </div>
              {c.ultima_mensagem && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {c.ultima_mensagem}
                </p>
              )}
            </div>
            <div className="text-xs text-muted-foreground sm:text-right">
              {c.ultima_atividade
                ? new Date(c.ultima_atividade).toLocaleString("pt-BR")
                : "—"}
            </div>
          </div>
        )}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
    </div>
  );
}



// ---------- Aguardando contato com humano ----------
function AtendimentoHumanoPanel() {
  const [status, setStatus] = useState<string>("aguardando");
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["atendimentos-humanos", status],
    queryFn: () => listAtendimentosHumanos({ data: { status } }),
    refetchInterval: 30_000,
  });

  const mut = useMutation({
    mutationFn: (p: { id: string; status: string }) =>
      updateAtendimentoStatus({ data: p }),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["atendimentos-humanos"] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao atualizar"),
  });

  const rows: AtendimentoHumano[] = query.data ?? [];

  const statusBadge: Record<string, string> = {
    aguardando: "bg-amber-100 text-amber-900 border-amber-300",
    em_atendimento: "bg-blue-100 text-blue-900 border-blue-300",
    resolvido: "bg-emerald-100 text-emerald-900 border-emerald-300",
  };

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5" />
              Aguardando contato com humano
            </CardTitle>
            <CardDescription>
              Clientes que a IA sinalizou para atendimento pessoal da equipe.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aguardando">Aguardando</SelectItem>
                <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                <SelectItem value="resolvido">Resolvido</SelectItem>
                <SelectItem value="todos">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma solicitação nesse status.
          </p>
        ) : (
          <HandoffList
            items={rows}
            statusBadge={statusBadge}
            onStatusChange={(id, status) => mut.mutate({ id, status })}
          />
        )}
      </CardContent>
    </Card>
  );
}

function HandoffList({
  items,
  statusBadge,
  onStatusChange,
}: {
  items: AtendimentoHumano[];
  statusBadge: Record<string, string>;
  onStatusChange: (id: string, status: string) => void;
}) {
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [items]);
  const pageItems = items.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  return (
    <div>
      <VirtualRows
        items={pageItems}
        estimateSize={180}
        maxHeight={640}
        getKey={(a) => a.id}
        renderItem={(a) => (
          <div className="rounded-lg border bg-card p-3 space-y-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  <span className="truncate">{a.nome ?? "Sem nome"}</span>
                  <Badge variant="outline" className={statusBadge[a.status] ?? ""}>
                    {a.status}
                  </Badge>
                  <Badge variant="outline">{a.canal}</Badge>
                  {a.sandbox && <Badge variant="outline">simulação</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select value={a.status} onValueChange={(v) => onStatusChange(a.id, v)}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="em_atendimento">Em atendimento</SelectItem>
                    <SelectItem value="resolvido">Resolvido</SelectItem>
                  </SelectContent>
                </Select>
                {a.status !== "resolvido" && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onStatusChange(a.id, "resolvido")}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Concluir
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-1 text-sm sm:grid-cols-2">
              <div>
                <span className="text-muted-foreground">Telefone: </span>
                {a.phone ?? "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Motivo: </span>
                {a.motivo ?? "—"}
              </div>
            </div>

            {a.observacoes && (
              <p className="text-sm bg-muted/50 rounded p-2 whitespace-pre-wrap">
                {a.observacoes}
              </p>
            )}
          </div>
        )}
      />
      <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
    </div>
  );
}

function fmtDateTime(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ReagendamentosPanel() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["reagendamentos-hist"],
    queryFn: () => listReagendamentos(),
  });

  const filtered = useMemo(() => {
    const rows = (data ?? []) as ReagendamentoHist[];
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.phone ?? "").toLowerCase().includes(term) ||
        (r.name ?? "").toLowerCase().includes(term) ||
        (r.service_name ?? "").toLowerCase().includes(term),
    );
  }, [data, q]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReagendamentoHist[]>();
    for (const r of filtered) {
      const key = r.phone;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([phone, items]) => ({
      phone,
      name: items.find((i) => i.name)?.name ?? null,
      last: items[0]?.created_at ?? null,
      items,
    }));
  }, [filtered]);

  const total = grouped.length;
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = grouped.slice(start, start + PAGE_SIZE);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5" /> Histórico de reagendamentos
            </CardTitle>
            <CardDescription>
              Reagendamentos feitos pela Julia, agrupados por cliente. Mostra horário antigo, novo,
              status e a mensagem enviada por WhatsApp.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por telefone, nome ou serviço"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : total === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nenhum reagendamento registrado ainda.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {pageItems.map((g) => {
              const isOpen = expanded[g.phone] ?? false;
              return (
                <Card key={g.phone}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [g.phone]: !isOpen }))
                    }
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {g.name ?? "Sem nome"}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            · {g.phone}
                          </span>
                        </CardTitle>
                        <CardDescription>
                          {g.items.length} reagendamento{g.items.length > 1 ? "s" : ""} · último em{" "}
                          {fmtDateTime(g.last)}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">{isOpen ? "Ocultar" : "Ver detalhes"}</Badge>
                    </div>
                  </CardHeader>
                  {isOpen && (
                    <CardContent className="space-y-3">
                      {g.items.map((r) => (
                        <div
                          key={r.id}
                          className="border rounded-md p-3 space-y-2 bg-muted/30"
                        >
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Badge
                              variant={
                                r.status === "rescheduled"
                                  ? "default"
                                  : r.status === "simulated_rescheduled"
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {r.status === "rescheduled"
                                ? "Reagendado"
                                : r.status === "simulated_rescheduled"
                                  ? "Simulado"
                                  : "Com aviso"}
                            </Badge>
                            {r.sandbox && <Badge variant="outline">Sandbox</Badge>}
                            {r.service_name && (
                              <span className="text-muted-foreground">{r.service_name}</span>
                            )}
                            <span className="ml-auto text-xs text-muted-foreground">
                              {fmtDateTime(r.created_at)}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">
                                Horário antigo
                              </div>
                              <div className="font-medium line-through decoration-muted-foreground/50">
                                {fmtDateTime(r.old_start)}
                              </div>
                              {r.old_appointment_id && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {r.old_appointment_id}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-xs uppercase text-muted-foreground">
                                Novo horário
                              </div>
                              <div className="font-medium">{fmtDateTime(r.new_start)}</div>
                              {r.new_appointment_id && (
                                <div className="text-xs text-muted-foreground">
                                  ID: {r.new_appointment_id}
                                </div>
                              )}
                            </div>
                          </div>
                          {r.warning && (
                            <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded p-2">
                              ⚠ {r.warning}
                            </div>
                          )}
                          <div>
                            <div className="text-xs uppercase text-muted-foreground flex items-center gap-2">
                              <MessageSquare className="h-3 w-3" />
                              Mensagem enviada por WhatsApp{" "}
                              {r.message_sent ? (
                                <Badge variant="outline" className="ml-1">
                                  Enviada · {fmtDateTime(r.message_sent_at)}
                                </Badge>
                              ) : (
                                <Badge variant="destructive" className="ml-1">
                                  Não enviada
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm bg-background border rounded p-2 mt-1 whitespace-pre-wrap">
                              {r.message_text ?? "—"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
          <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}




// ---------- Stripe Health ----------
function StripeHealthPanel() {
  const env = getStripeEnvironment();
  const verify = useServerFn(verifyStripeSetup);
  
  const q = useQuery({
    queryKey: ["stripe-health", env],
    queryFn: () => verify({ data: { environment: env } }),
    staleTime: 5 * 60_000,
  });

  if (q.isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto" /></div>;

  const results = q.data && 'results' in q.data ? q.data.results : [];
  const error = q.data && 'error' in q.data ? q.data.error : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" /> Saúde da Integração Stripe
        </CardTitle>
        <CardDescription>
          Verifica se os planos configurados no sistema existem no seu Stripe (Lookup Keys).
          Ambiente atual: <Badge variant="outline">{env}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na verificação</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.isArray(results) && results.map((r: any) => (
              <Card key={r.planId} className="bg-muted/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-medium">{r.planId}</span>
                    {r.found ? (
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" /> Não encontrado
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {r.found ? (
                      r.active ? "Preço ativo no Stripe." : "Preço encontrado mas está inativo."
                    ) : (
                      "Crie um produto/preço no Stripe com Lookup Key exatamente igual ao ID acima."
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
