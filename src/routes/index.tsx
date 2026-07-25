import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listSalons,
  listServices,
  listProfessionals,
  listSlots,
  listCustomerAppointments,
} from "@/lib/bemp.functions";
import { getWhatsAppPhoneNumber } from "@/lib/whatsapp.functions";
import { WhatsAppQr } from "@/components/whatsapp-qr";
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
import { CalendarClock, Building2, Scissors, Bot, Clock, DollarSign, Phone, RefreshCw, Search, BookOpen, QrCode } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard Bemp — Agenda em tempo real" },
      {
        name: "description",
        content:
          "Painel para acompanhar unidades, serviços, profissionais e agendamentos integrados à plataforma Bemp.",
      },
      { property: "og:title", content: "Dashboard Bemp — Agenda em tempo real" },
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
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center gap-3">
          <div className="rounded-lg bg-primary text-primary-foreground p-2">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Secretária Virtual — Bemp</h1>
            <p className="text-sm text-muted-foreground">
              Dashboard integrado à sua conta Bemp.
            </p>
          </div>
          <Link
            to="/agendar"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Bot className="h-4 w-4" /> Agendar com IA
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="catalogo" className="space-y-6">
          <TabsList>
            <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
            <TabsTrigger value="agenda">Agenda por cliente</TabsTrigger>
            <TabsTrigger value="horarios">Horários disponíveis</TabsTrigger>
          </TabsList>

          <TabsContent value="catalogo">
            <CatalogoPanel />
          </TabsContent>
          <TabsContent value="agenda">
            <AgendaPanel />
          </TabsContent>
          <TabsContent value="horarios">
            <SlotsPanel />
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
    refetchInterval: 60_000,
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
    refetchInterval: 60_000,
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
          {appointments.map((a, i) => (
            <div key={str(a.id) || i} className="rounded-lg border p-3 flex items-center justify-between gap-3">
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
          ))}
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
