import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  QrCode,
  Info,
  Loader2,
  Trash2,
  PlugZap,
  RefreshCw,
  MessageCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  listAgentes,
  criarAgente,
  gerarQrAgente,
  statusAgente,
  desconectarAgente,
  removerAgente,
  selecionarUnidadeAgente,
  toggleIAAgente,
  syncEvolutionInstances,
  updateAgentServiceHours,
  getAgentServiceHoursConfig,
  type AgenteWa,
} from "@/lib/agentes-whatsapp.functions";

import { listSalons } from "@/lib/bemp.functions";

export const Route = createFileRoute("/_authenticated/agentes-whatsapp")({
  head: () => ({
    meta: [{ title: "Agentes de WhatsApp — Salão Seja Livre" }],
  }),
  component: AgentesWhatsAppPage,
});

function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function formatSaved(digits: string) {
  const d = digits.startsWith("55") ? digits.slice(2) : digits;
  return maskPhone(d);
}

function StatusBadge({ status, statusConexao }: { status: AgenteWa["status"]; statusConexao?: AgenteWa["status_conexao"] }) {
  // Priorizar status_conexao para exibição de conectividade em tempo real
  if (statusConexao === "conectando") return <Badge className="bg-blue-400 text-white">Conectando...</Badge>;
  if (statusConexao === "desconectado") return <Badge className="bg-slate-400 text-white">Desconectado</Badge>;
  if (statusConexao === "conectado" && status === "conectado_sem_unidade") return <Badge className="bg-amber-500 text-white">Sem Unidade</Badge>;
  if (statusConexao === "conectado" && status === "ativo") return <Badge className="bg-emerald-600 text-white">Conectado</Badge>;

  const config: Record<string, { label: string; className: string }> = {
    ativo: { label: "Ativo", className: "bg-emerald-600 text-white" },
    conectado_sem_unidade: { label: "Escolha a unidade", className: "bg-amber-500 text-white" },
    aguardando_conexao: { label: "Aguardando Conexão", className: "bg-blue-500 text-white" },
    aguardando_qr: { label: "Aguardando QR", className: "bg-blue-400 text-white" },
    inativo: { label: "Inativo", className: "bg-slate-400 text-white" },
    erro_conexao: { label: "Erro", className: "bg-red-500 text-white" },
    conectado: { label: "Conectado", className: "bg-emerald-600 text-white" },
    desconectado: { label: "Desconectado", className: "bg-slate-400 text-white" },
    CONNECTED: { label: "Conectado", className: "bg-emerald-600 text-white" },
    QR_PENDING: { label: "Aguardando QR", className: "bg-amber-400 text-white" },
    DISCONNECTED: { label: "Desconectado", className: "bg-slate-400 text-white" },
  };
  const c = config[status] || config.inativo;
  return <Badge className={c.className}>{c.label}</Badge>;
}

function AgentesWhatsAppPage() {
  const fetchList = useServerFn(listAgentes);
  const create = useServerFn(criarAgente);
  const genQr = useServerFn(gerarQrAgente);
  const checkStatus = useServerFn(statusAgente);
  const disconnect = useServerFn(desconectarAgente);
  const remove = useServerFn(removerAgente);
  const selectUnit = useServerFn(selecionarUnidadeAgente);
  const updateServiceHours = useServerFn(updateAgentServiceHours);
  const getServiceHours = useServerFn(getAgentServiceHoursConfig);


  const [items, setItems] = useState<AgenteWa[]>([]);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [tipo, setTipo] = useState<"feminino" | "masculino">("feminino");
  const [telefone, setTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [qrOpen, setQrOpen] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);
  const [qrAgente, setQrAgente] = useState<AgenteWa | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  const [unitOpen, setUnitOpen] = useState(false);
  const [selectedAgente, setSelectedAgente] = useState<AgenteWa | null>(null);
  const [unitId, setUnitId] = useState("");
  const [salons, setSalons] = useState<any[]>([]);
  const [loadingSalons, setLoadingSalons] = useState(false);
  
  const [configOpen, setConfigOpen] = useState(false);
  const [configAgent, setConfigAgent] = useState<AgenteWa | null>(null);
  const [configHours, setConfigHours] = useState<any[]>([]);
  const [configEnabled, setConfigEnabled] = useState(false);
  const [configTimezone, setConfigTimezone] = useState("America/Sao_Paulo");


  const reload = useCallback(async () => {
    try {
      const data = await fetchList();
      setItems(data.items);
      setConfigured(Boolean(data.configured));
    } catch (err) {
      toast.error("Erro ao carregar agentes");
    } finally {
      setLoading(false);
    }
  }, [fetchList]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Realtime updates for agent status (Item 9)
  useEffect(() => {
    const channel = supabase
      .channel("wa_agentes_all_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wa_agentes",
        },
        (payload) => {
          const updated = payload.new as AgenteWa;
          setItems(current => 
            current.map(item => item.id === updated.id ? { ...item, ...updated } : item)
          );
          
          // Abre modal de unidade se o agente foi recém-conectado e não tem unidade (Item 1)
          if (updated.status === "conectado_sem_unidade" && !updated.unidade_id && payload.eventType === "UPDATE") {
            handleOpenUnit(updated, "auto");
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!qrOpen || !qrAgente) return;
    const id = setInterval(async () => {
      try {
        const r = await checkStatus({ data: { id: qrAgente.id } });
        if (r.status === "conectado_sem_unidade" || r.status === "ativo") {
          clearInterval(id);
          setQrOpen(false);
          if (r.status === "conectado_sem_unidade") {
            toast.success("Conectado! Agora selecione a unidade.");
            handleOpenUnit(qrAgente, "auto");
          } else {
            toast.success("Agente conectado e ativo!");
            void reload();
          }
        }
      } catch (err) {
        console.error("Erro ao verificar status do QR:", err);
      }
    }, 5000);
    return () => clearInterval(id);
  }, [qrOpen, qrAgente, checkStatus, reload]);

  const handleOpenUnit = async (agente: AgenteWa, trigger: "manual" | "auto") => {
    setSelectedAgente(agente);
    setUnitId(agente.unidade_id || "");
    setUnitOpen(true); // Always open the dialog (Item 1)
    setLoadingSalons(true);
    try {
      const res = await listSalons();
      // Filtrar unidades ativas, não excluídas e permitidas para o usuário (Item 2) - BEMP API já deveria fazer isso
      setSalons(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error("Erro ao carregar unidades:", err);
      setSalons([]);
      toast.error("Erro ao carregar unidades. Tente novamente.");
    } finally {
      setLoadingSalons(false);
    }
  };

  async function handleConfirmUnit() {
    if (!selectedAgente || !unitId) return;
    
    const selectedUnitName = salons.find(s => String(s.id) === unitId)?.name || "esta unidade";
    const confirmed = window.confirm(`Confirma o vínculo deste WhatsApp com a unidade ${selectedUnitName}?`); // Item 3
    if (!confirmed) return;

    setSaving(true);
    try {
      await selectUnit({ data: { agenteId: selectedAgente.id, unidadeId: unitId } });
      toast.success("Unidade vinculada com sucesso!");
      setUnitOpen(false);
      void reload();
    } catch (err: any) {
      toast.error(err.message || "Erro ao vincular unidade");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate() {
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10) return toast.error("Informe o número com DDD.");
    setSaving(true);
    try {
      const res = await create({ data: { tipo, telefone: digits, origin: window.location.origin } });
      if (res.error || !res.agente) {
        setConnectionError(res.error ?? "Não foi possível criar o agente.");
        return;
      }
      setAddOpen(false);
      setTelefone("");
      setQrAgente(res.agente as any);
      setQrData(res.qr);
      setQrOpen(true);
      await reload();
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar agente");
    } finally {
      setSaving(false);
    }
  }

  async function openQr(agente: AgenteWa) {
    setQrAgente(agente);
    setQrData(null);
    setQrOpen(true);
    setQrLoading(true);
    try {
      const r = await genQr({ data: { id: agente.id, origin: window.location.origin } });
      if (r.status === "conectado" || r.status === "ativo" || r.status === "conectado_sem_unidade") {
        setQrOpen(false);
        toast.success("Este agente já está conectado.");
        if (r.status === "conectado_sem_unidade") handleOpenUnit(agente, "auto");
        void reload();
        return;
      }
      setQrData(r.qr);
    } catch (err: any) {
      toast.error(err.message || "Erro ao gerar QR Code");
    } finally {
      setQrLoading(false);
    }
  }

  async function handleOpenConfig(agente: AgenteWa) {
    if (!agente.unidade_id) {
      toast.error("Vincule uma unidade antes de configurar horários.");
      return;
    }
    setConfigAgent(agente);
    setConfigEnabled(agente.service_hours_enabled || false);
    setConfigTimezone(agente.timezone || "America/Sao_Paulo");
    setLoading(true);
    try {
      const res = await getServiceHours({ data: { unidadeId: agente.unidade_id } });
      const days = [0,1,2,3,4,5,6];
      const hours = days.map(d => {
        const existing = res.hours.find(h => h.day_of_week === d);
        return existing || {
          day_of_week: d,
          is_active: true,
          opening_time: "08:00",
          closing_time: "20:00"
        };
      });
      setConfigHours(hours);
      setConfigOpen(true);
    } catch (err) {
      toast.error("Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig() {
    if (!configAgent || !configAgent.unidade_id) return;
    setSaving(true);
    try {
      await updateServiceHours({
        data: {
          agenteId: configAgent.id,
          unidadeId: configAgent.unidade_id,
          enabled: configEnabled,
          timezone: configTimezone,
          hours: configHours
        }
      });
      toast.success("Configurações salvas!");
      setConfigOpen(false);
      void reload();
    } catch (err) {
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  }

  const dayNames = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];


  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6">
      <header className="space-y-1">
        <h1 className="font-display text-2xl tracking-tight">Gerenciador de Agentes</h1>
        <p className="text-sm text-muted-foreground">Gerencie instâncias da Evolution API e vincule a unidades do salão</p>
      </header>

      <div className="flex gap-2">
        <Button className="flex-1" size="lg" onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Adicionar agente
        </Button>
        <Button 
          variant="outline" 
          size="lg" 
          disabled={syncing}
          onClick={async () => {
            setSyncing(true);
            try {
              const res = await syncEvolutionInstances();
              await reload();
              
              if (res.stats.updatedCount > 0) {
                toast.success("Agentes sincronizados com sucesso");
              } else {
                toast.info("Agentes já estão sincronizados");
              }
            } catch (err) {
              console.error("[AGENTS_SYNC_ERROR]", err);
              toast.error("Erro ao sincronizar agentes");
            } finally {
              setSyncing(false);
            }
          }}
        >
          {syncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar
            </>
          )}
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin opacity-20" /> : items.map((a) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.nome} <span className="text-xs font-normal text-muted-foreground">· {a.tipo}</span></p>
                <p className="text-sm text-muted-foreground">{formatSaved(a.telefone || "")}</p>
                {a.unidade_id && <p className="text-[10px] text-primary flex items-center mt-1"><Building2 className="h-3 w-3 mr-1" /> Unidade: {a.unidade_id}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={a.ia_ativa ? "border-primary text-primary" : "text-muted-foreground"}>
                    {a.ia_ativa ? "IA Ativa" : "IA Inativa"}
                  </Badge>
                  <StatusBadge status={a.status} statusConexao={a.status_conexao} />
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 text-[10px]" 
                    onClick={() => void toggleIAAgente({ data: { id: a.id, enabled: !a.ia_ativa } }).then(() => reload())}
                  >
                    {a.ia_ativa ? "Pausar IA" : "Ativar IA"}
                  </Button>
                  {a.status === "conectado_sem_unidade" && (
                    <Button size="sm" variant="default" className="h-7 text-[10px]" onClick={() => handleOpenUnit(a, "manual")}>Escolher Unidade</Button>
                  )}
                  {a.unidade_id && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleOpenUnit(a, "manual")}>Alterar Unidade</Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleOpenConfig(a)} title="Horários"><Info className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openQr(a)} title="QR Code"><QrCode className="h-3.5 w-3.5" /></Button>

                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => void removerAgente({data:{id:a.id}}).then(()=>reload())} title="Excluir"><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal Unidade */}
      <Dialog open={unitOpen} onOpenChange={(open) => {
        // Não permitir fechar clicando fora ou com ESC (Item 1)
        if (!saving) setUnitOpen(open);
      }}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>WhatsApp conectado com sucesso</DialogTitle>
            <DialogDescription>Agora escolha em qual unidade este número irá operar. A IA utilizará somente os dados dessa unidade.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
             <div className="space-y-2">
               <Label>Unidade Ativa</Label>
               <Select value={unitId} onValueChange={setUnitId}>
                 <SelectTrigger><SelectValue placeholder="Selecione uma unidade..." /></SelectTrigger>
                 <SelectContent>
                   {salons.map((s: any) => (
                     <SelectItem key={s.id} value={String(s.id)}>
                       {s.name} {s.address && ` - ${s.address}`}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
          </div>
          <DialogFooter>
             <Button variant="outline" onClick={() => setUnitOpen(false)}>Cancelar</Button>
             <Button onClick={handleConfirmUnit} disabled={!unitId || saving}>Confirmar Unidade</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reutilizando modais de QR e Add simplificados */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Agente</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Número com DDD" value={telefone} onChange={e => setTelefone(maskPhone(e.target.value))} />
            <Select value={tipo} onValueChange={v => setTipo(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="feminino">Julia (Feminino)</SelectItem><SelectItem value="masculino">Bruno (Masculino)</SelectItem></SelectContent>
            </Select>
          </div>
          <DialogFooter><Button onClick={handleCreate} disabled={saving}>Gerar QR Code</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader><DialogTitle>Conectar WhatsApp</DialogTitle></DialogHeader>
          <div className="py-4 flex justify-center">
            {qrLoading ? <Loader2 className="h-12 w-12 animate-spin" /> : qrData ? <img src={qrData} className="w-64 h-64 border p-2 bg-white" /> : "Erro ao carregar QR"}
          </div>
          <p className="text-xs text-muted-foreground">Escaneie o QR Code no seu celular.</p>
        </DialogContent>
      </Dialog>

      {/* Modal Configuração de Horários */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configuração Julia AI - {configAgent?.nome}</DialogTitle>
            <DialogDescription>Defina os horários em que a IA responderá automaticamente.</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border border-primary/10">
              <div className="space-y-0.5">
                <Label className="text-base">Ativar Controle de Horário</Label>
                <p className="text-sm text-muted-foreground">Julia só responderá dentro da janela definida.</p>
              </div>
              <Button 
                variant={configEnabled ? "default" : "outline"} 
                onClick={() => setConfigEnabled(!configEnabled)}
              >
                {configEnabled ? "Ativado" : "Desativado"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Timezone da Unidade</Label>
              <Select value={configTimezone} onValueChange={setConfigTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/Sao_Paulo">Brasília (GMT-3)</SelectItem>
                  <SelectItem value="America/Manaus">Manaus (GMT-4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Janelas de Atendimento</Label>
              <div className="grid gap-3">
                {configHours.map((h, i) => (
                  <div key={h.day_of_week} className="flex items-center gap-4 p-3 border rounded-lg bg-card">
                    <div className="w-24 font-medium text-sm">{dayNames[h.day_of_week]}</div>
                    <Button 
                      size="sm" 
                      variant={h.is_active ? "ghost" : "outline"} 
                      className={h.is_active ? "text-primary" : "text-muted-foreground opacity-50"}
                      onClick={() => {
                        const newHours = [...configHours];
                        newHours[i].is_active = !newHours[i].is_active;
                        setConfigHours(newHours);
                      }}
                    >
                      {h.is_active ? "Aberto" : "Fechado"}
                    </Button>
                    {h.is_active && (
                      <div className="flex items-center gap-2 flex-1">
                        <Input 
                          type="time" 
                          value={h.opening_time.slice(0,5)} 
                          className="h-8"
                          onChange={e => {
                            const newHours = [...configHours];
                            newHours[i].opening_time = e.target.value;
                            setConfigHours(newHours);
                          }}
                        />
                        <span className="text-muted-foreground">até</span>
                        <Input 
                          type="time" 
                          value={h.closing_time.slice(0,5)} 
                          className="h-8"
                          onChange={e => {
                            const newHours = [...configHours];
                            newHours[i].closing_time = e.target.value;
                            setConfigHours(newHours);
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={saving}>Salvar Configuração</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
