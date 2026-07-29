import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { VirtualRows, Pagination } from "@/components/virtual-rows";

const PAGE_SIZE = 30;
import {
  listSalons,
  listServices,
  listProfessionals,
  listSlots,
  listCustomerAppointments,
} from "@/lib/bemp.functions";
import { getWhatsAppPhoneNumber } from "@/lib/whatsapp.functions";
import { listLeadsAssinatura, updateLeadStatus, type LeadAssinatura } from "@/lib/leads.functions";
import {
  listClientesAtendidos,
  listAtendimentosHumanos,
  updateAtendimentoStatus,
  type ClienteAtendido,
  type AtendimentoHumano,
} from "@/lib/atendimentos.functions";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WhatsAppQr } from "@/components/whatsapp-qr";
import { SandboxToggle } from "@/components/sandbox-toggle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarClock, Building2, Scissors, Bot, Clock, DollarSign, Phone, RefreshCw, Search, BookOpen, QrCode, Users, Filter, Sparkles, ClipboardList, UserCheck, LifeBuoy, MessageSquare, CheckCircle2 } from "lucide-react";

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
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6 grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:flex sm:items-center">
          <div className="rounded-lg bg-primary text-primary-foreground p-2 shrink-0">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="min-w-0 sm:flex-1">
            <h1 className="truncate text-lg sm:text-xl font-semibold tracking-tight">
              Secretária Virtual — Bemp
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Painel integrado à sua conta Bemp.
            </p>
          </div>
          <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-auto">
            <SandboxToggle />
            <Link
              to="/base-conhecimento"
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
            >
              <BookOpen className="h-4 w-4" /> <span className="hidden sm:inline">Base de conhecimento</span><span className="sm:hidden">Base</span>
            </Link>
            <Link
              to="/sugestoes"
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
            >
              <Sparkles className="h-4 w-4" /> Sugestões
            </Link>
            <Link
              to="/auditoria-sugestoes"
              className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/90"
            >
              <ClipboardList className="h-4 w-4" /> Auditoria
            </Link>
            <Link
              to="/agendar"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Bot className="h-4 w-4" /> <span className="hidden sm:inline">Agendar com IA</span><span className="sm:hidden">Agendar</span>
            </Link>
          </div>
        </div>
      </header>


      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
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
                <QrCode className="h-4 w-4 mr-1" /> WhatsApp
              </TabsTrigger>
              <TabsTrigger value="atendidos">
                <UserCheck className="h-4 w-4 mr-1" /> Atendidos
              </TabsTrigger>
              <TabsTrigger value="handoff">
                <LifeBuoy className="h-4 w-4 mr-1" /> Aguardando humano
              </TabsTrigger>
              <TabsTrigger value="reagendamentos">
                <CalendarClock className="h-4 w-4 mr-1" /> Reagendamentos
              </TabsTrigger>
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
          <TabsContent value="atendidos">
            <ClientesAtendidosPanel />
          </TabsContent>
          <TabsContent value="handoff">
            <AtendimentoHumanoPanel />
          </TabsContent>
          <TabsContent value="reagendamentos">
            <ReagendamentosPanel />
          </TabsContent>
        </Tabs>

      </main>
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


