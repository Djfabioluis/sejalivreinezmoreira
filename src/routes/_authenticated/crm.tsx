import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { 
  listCustomerPipeline, 
  getCRMDashboardStats, 
  listOpportunities, 
  listRecommendations,
  triggerCampaignGeneration,
  listFollowupRules,
  listFollowupHistory,
  listFollowupExecutions,
  getFollowupStats,
  saveFollowupRule,
  deleteFollowupRule,
  runFollowupTest,
  getWorkerStatus

} from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  Plus, Clock, Zap, MessageSquare, Bot, Sparkles, Settings, History, LayoutDashboard,
  Play, Edit2, Trash2, Loader2, PlayCircle, Activity, Info, ChevronRight, CheckCircle2, AlertCircle, XCircle, Phone,
  Database, ShieldCheck
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [{ title: "Follow-up & CRM Inteligente — Julia" }],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["crm-pipeline"], queryFn: () => listCustomerPipeline() }),
      context.queryClient.ensureQueryData({ queryKey: ["crm-stats"], queryFn: () => getCRMDashboardStats() }),
      context.queryClient.ensureQueryData({ queryKey: ["followup-rules"], queryFn: () => listFollowupRules() }),
      context.queryClient.ensureQueryData({ queryKey: ["followup-history"], queryFn: () => listFollowupHistory() }),
      context.queryClient.ensureQueryData({ queryKey: ["followup-executions"], queryFn: () => listFollowupExecutions() }),
      context.queryClient.ensureQueryData({ queryKey: ["followup-stats"], queryFn: () => getFollowupStats() }),

      context.queryClient.ensureQueryData({ queryKey: ["worker-status"], queryFn: () => getWorkerStatus() }),
    ]);
  },
  component: CRMPage,
});

function CRMPage() {
  const queryClient = useQueryClient();
  const saveRuleFn = useServerFn(saveFollowupRule);
  const deleteRuleFn = useServerFn(deleteFollowupRule);
  const runTestFn = useServerFn(runFollowupTest);
  
  const { data: pipeline } = useSuspenseQuery({ queryKey: ["crm-pipeline"], queryFn: () => listCustomerPipeline() });
  const { data: rules } = useSuspenseQuery({ queryKey: ["followup-rules"], queryFn: () => listFollowupRules() });
  const { data: history } = useSuspenseQuery({ queryKey: ["followup-history"], queryFn: () => listFollowupHistory() });
  const { data: executions } = useSuspenseQuery({ queryKey: ["followup-executions"], queryFn: () => listFollowupExecutions() });

  const { data: fStats } = useSuspenseQuery({ queryKey: ["followup-stats"], queryFn: () => getFollowupStats() });
  const { data: workerStatus } = useSuspenseQuery({ queryKey: ["worker-status"], queryFn: () => getWorkerStatus() });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);
  const [selectedExecution, setSelectedExecution] = useState<any>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    // Se for um JID ou chave composta, pega só o final
    const clean = phone.includes(':') ? phone.split(':')[1] : phone;
    // Formato E.164 brasileiro (55DD9...)
    if (clean.startsWith('55') && clean.length >= 12) {
      return `+${clean.slice(0, 2)} (${clean.slice(2, 4)}) ${clean.slice(4, 9)}-${clean.slice(9)}`;
    }
    return clean;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'CANCELED': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'PROCESSING': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleRunTest = async (ruleId: string) => {
    const phone = prompt("Digite o telefone para teste (formato 5511999999999):");
    if (!phone) return;
    
    toast.loading("Executando teste...");
    try {
      const result = await runTestFn({ data: { ruleId, phone } });
      toast.dismiss();
      toast.success(`Teste executado! Status: ${result.status}`);
      queryClient.invalidateQueries({ queryKey: ["followup-history"] });
    } catch (err: any) {
      toast.dismiss();
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm gap-4">
          <div className="flex items-center gap-4">
             <div className="bg-emerald-500/10 p-2 rounded-full">
               <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
             </div>
             <div>
                <h3 className="text-sm font-bold">Motor de Follow-up <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none">ONLINE</Badge></h3>
                <p className="text-[10px] text-muted-foreground">Fila: {workerStatus.queueSize} | Polling: {format(new Date(), "HH:mm:ss")}</p>
             </div>
          </div>
        </div>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Zap className="h-3 w-3 text-primary" /> Último processamento do Worker
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-2 gap-y-2 text-[10px]">
              <div className="text-muted-foreground">Última execução:</div>
              <div className="font-mono">{workerStatus.lastRun ? format(new Date(workerStatus.lastRun), "dd/MM HH:mm:ss", { locale: ptBR }) : '-'}</div>
              <div className="text-muted-foreground">Último job:</div>
              <div className="font-mono truncate">{workerStatus.lastJob ? `${workerStatus.lastJob.status} (${workerStatus.lastJob.phone})` : '-'}</div>
              <div className="text-muted-foreground">Último envio:</div>
              <div className="font-mono">{workerStatus.lastSentAt ? format(new Date(workerStatus.lastSentAt), "HH:mm:ss", { locale: ptBR }) : '-'}</div>
              {workerStatus.lastError && (
                <>
                  <div className="text-red-500 font-bold">Último erro:</div>
                  <div className="text-red-500 truncate">{workerStatus.lastError}</div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button 
            onClick={() => {
              setEditingRule(null);
              setIsModalOpen(true);
            }}
            className="flex-1 md:flex-none gap-2"
          >
            <Plus className="h-4 w-4" /> Nova Regra
          </Button>
          <Button 
            variant="outline" 
            onClick={() => queryClient.invalidateQueries()}
            className="flex-1 md:flex-none gap-2"
          >
            <Loader2 className="h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg gap-2"><Settings className="h-4 w-4" /> Regras Ativas</TabsTrigger>
          <TabsTrigger value="executions" className="rounded-lg gap-2"><PlayCircle className="h-4 w-4" /> Execuções</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
           <div className="grid gap-6 md:grid-cols-4">
            <StatsCard title="Pendentes" value={fStats.pending} icon={Clock} color="text-amber-500" />
            <StatsCard title="Hoje" value={fStats.sentToday} icon={Zap} color="text-primary" />
            <StatsCard title="Falhas" value={fStats.failed} icon={Loader2} color="text-red-500" />
            <StatsCard title="Recuperados" value={fStats.recovered} icon={Sparkles} color="text-emerald-500" />
           </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
            {rules.map((rule: any) => (
              <Card key={rule.id} className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="bg-primary/10 p-3 rounded-lg"><Bot className="h-6 w-6 text-primary" /></div>
                   <div>
                     <p className="font-bold">{rule.name}</p>
                     <p className="text-xs text-muted-foreground uppercase">{rule.type}</p>
                   </div>
                </div>
                <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={() => handleRunTest(rule.id)}><Play className="h-3 w-3 mr-2" /> Testar</Button>
                   <Button variant="ghost" size="icon" onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}><Edit2 className="h-4 w-4" /></Button>
                   <Button variant="ghost" size="icon" className="text-destructive" onClick={() => {
                     if (confirm("Excluir regra?")) {
                       deleteRuleFn({ data: { id: rule.id } }).then(() => {
                         toast.success("Regra excluída");
                         queryClient.invalidateQueries({ queryKey: ["followup-rules"] });
                       });
                     }
                   }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
            {rules.length === 0 && (
              <div className="p-12 text-center text-muted-foreground bg-muted/20 rounded-xl border border-dashed">
                Nenhuma regra ativa encontrada.
              </div>
            )}
        </TabsContent>

        <TabsContent value="executions" className="space-y-4">
           <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                   <thead className="bg-muted/50 uppercase tracking-widest font-bold text-[10px] text-muted-foreground border-b border-border/40">
                      <tr>
                         <th className="px-6 py-4">Job ID</th>
                         <th className="px-6 py-4">Cliente</th>
                         <th className="px-6 py-4">Regra</th>
                         <th className="px-6 py-4">Agendado</th>
                         <th className="px-6 py-4">Status</th>
                         <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {executions.map((e: any) => (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                           <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{e.id.split('-')[0]}</td>
                           <td className="px-6 py-4 font-bold">{formatPhone(e.phone)}</td>
                           <td className="px-6 py-4">{e.rule?.name || 'Manual'}</td>
                           <td className="px-6 py-4 text-muted-foreground">{format(new Date(e.scheduled_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className={`text-[9px] uppercase \${e.status === 'PROCESSING' ? 'border-blue-500/20 text-blue-600 animate-pulse' : 'border-amber-500/20 text-amber-600'}`}>
                                 {e.status}
                              </Badge>
                           </td>
                           <td className="px-6 py-4 text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 gap-2"
                                onClick={() => {
                                  setSelectedExecution(e);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Info className="h-3 w-3" /> Detalhes
                              </Button>
                           </td>
                        </tr>
                      ))}
                      {executions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                            Nenhuma execução pendente na fila.
                          </td>
                        </tr>
                      )}
                   </tbody>

                </table>
             </div>
           </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                   <thead className="bg-muted/50 uppercase tracking-widest font-bold text-[10px] text-muted-foreground border-b border-border/40">
                       <tr>
                          <th className="px-6 py-4">Job ID</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4">Regra</th>
                          <th className="px-6 py-4">Message ID</th>
                          <th className="px-6 py-4">Motivo</th>
                          <th className="px-6 py-4">Executado em</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                           <td className="px-6 py-4 font-mono text-[10px] text-muted-foreground">{h.id.split('-')[0]}</td>
                           <td className="px-6 py-4 font-bold">{formatPhone(h.phone)}</td>
                           <td className="px-6 py-4">{h.rule?.name || 'Manual'}</td>
                           <td className="px-6 py-4 font-mono text-[10px]">{h.message_id || '-'}</td>
                            <td className="px-6 py-4 max-w-xs">
                              {h.status === 'CANCELED' ? (
                                <Badge variant="secondary" className="text-[9px] bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 border-none">
                                  {h.cancel_reason || 'Desconhecido'}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground italic">Sem motivo</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">{format(new Date(h.completed_at || h.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                            <td className="px-6 py-4">
                                <Badge variant="outline" className={`text-[9px] uppercase ${
                                  h.status === 'SENT' ? 'border-emerald-500/20 text-emerald-600 bg-emerald-50/50' : 
                                  h.status === 'DELIVERED' ? 'border-green-500/20 text-green-600' :
                                  h.status === 'READ' ? 'border-purple-500/20 text-purple-600' :
                                  h.status === 'CANCELED' ? 'border-amber-500/20 text-amber-600 bg-amber-50/50' : 
                                  'border-red-500/20 text-red-600 bg-red-50/50'}`}>
                                   {h.status === 'SENT' ? '🟢 ' : h.status === 'CANCELED' ? '🟠 ' : h.status === 'FAILED' ? '🔴 ' : ''}
                                   {h.status}
                                </Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <Button 
                                 variant="ghost" 
                                 size="sm" 
                                 className="h-8 gap-2"
                                 onClick={() => {
                                   setSelectedExecution(h);
                                   setIsDetailsOpen(true);
                                 }}
                               >
                                 <Info className="h-3 w-3" /> Ver detalhes
                               </Button>
                            </td>
                        </tr>
                      ))}
                      {history.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                            Nenhum registro no histórico.
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
             </div>
          </Card>
        </TabsContent>

      </Tabs>

      <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm p-6">
        <h3 className="text-sm font-bold flex items-center gap-2 mb-4"><Activity className="h-4 w-4" /> Logs Técnicos do Motor</h3>
        <ScrollArea className="h-64 bg-black/5 rounded-lg p-4 font-mono text-[10px]">
          <div className="space-y-1">
            <p className="text-emerald-500">[FOLLOWUP_CREATED] Regra: Abandono de Fluxo - Cliente: 5511999999999</p>
            <p className="text-blue-500">[FOLLOWUP_READY] Pronto para envio - Delay de 30 min atingido</p>
            <p className="text-emerald-500">[FOLLOWUP_SENT] Mensagem enviada via Evolution - ID: 3EB0B...</p>
            <p className="text-amber-500">[FOLLOWUP_PROCESSING] Iniciando varredura de conversas inativas...</p>
            {executions.map((e: any) => (
              <p key={e.id} className="text-muted-foreground italic">[{e.status}] {e.phone} - rule_id: {e.rule_id}</p>
            ))}
            {history.slice(0, 5).map((h: any) => (
              <p key={h.id} className="text-muted-foreground">[{h.status}] {h.phone} - message sent at {h.completed_at}</p>
            ))}

          </div>
        </ScrollArea>
      </Card>

      <FollowupRuleModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingRule(null);
        }}
        rule={editingRule}
        onSave={async (ruleData: any) => {
          toast.loading("Salvando regra...");
          try {
            await saveRuleFn({ data: ruleData });
            toast.dismiss();
            toast.success("Regra salva com sucesso!");
            setIsModalOpen(false);
            setEditingRule(null);
            queryClient.invalidateQueries({ queryKey: ["followup-rules"] });
          } catch (err: any) {
            toast.dismiss();
            toast.error(err.message || "Erro ao salvar regra");
          }
        }}
      />

      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" /> Detalhes da Execução
            </SheetTitle>
            <SheetDescription>
              Diagnóstico completo e auditoria real do banco de dados.
            </SheetDescription>
          </SheetHeader>


          {selectedExecution && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right duration-300">
              {/* MODO DEBUG OBRIGATÓRIO */}
              <Card className="bg-slate-950 text-slate-50 border-slate-800 shadow-2xl overflow-hidden">
                <CardHeader className="py-3 px-4 bg-slate-900/50 border-b border-slate-800">
                  <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
                    <ShieldCheck className="h-3 w-3" /> Job Audit & Correlation
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                   <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                      <div className="space-y-1">
                        <span className="text-slate-500 block">JOB ID:</span>
                        <span className="text-primary truncate block">{selectedExecution.id}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">STATUS:</span>
                        <Badge variant="outline" className={`h-4 text-[9px] uppercase border-primary/30 text-primary \${selectedExecution.status === 'PROCESSING' ? 'animate-pulse' : ''}`}>
                          {selectedExecution.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">CONVERSATION ID:</span>
                        <span className={selectedExecution.conversation_id || selectedExecution.metadata?.conversationId ? "text-emerald-400" : "text-red-500"}>
                          {selectedExecution.conversation_id || selectedExecution.metadata?.conversationId || "NULL / NOT_FOUND"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">MESSAGE ID:</span>
                        <span className={selectedExecution.message_id || selectedExecution.metadata?.message_id ? "text-emerald-400" : "text-red-500"}>
                          {selectedExecution.message_id || selectedExecution.metadata?.message_id || "NULL / NOT_SENT"}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">TRACE ID:</span>
                        <span className="text-amber-400 truncate block">{selectedExecution.metadata?.trace_id || "N/A"}</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-500 block">PHONE LAST 4:</span>
                        <span className="text-slate-300 block">{selectedExecution.phone?.slice(-4) || "????"}</span>
                      </div>
                   </div>

                   <div className="pt-2 border-t border-slate-800">
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-2">Supabase Query Context</p>
                      <code className="text-[9px] bg-black/40 p-2 rounded block text-emerald-500/80 leading-tight">
                        SELECT * FROM crm_followups WHERE id = '{selectedExecution.id}'
                      </code>
                   </div>

                   <div className="pt-2">
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-2">RAW DB RECORD (JSON)</p>
                      <ScrollArea className="h-40 w-full rounded border border-slate-800 bg-black/20 p-2">
                        <pre className="text-[9px] leading-tight text-slate-300">
                          {JSON.stringify(selectedExecution, null, 2)}
                        </pre>
                      </ScrollArea>
                   </div>
                </CardContent>
              </Card>

              {/* Timeline Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Timeline da Operação
                </h4>

                
                <div className="relative pl-6 space-y-6 border-l border-border ml-2">
                  {[
                    { label: 'FOLLOWUP_CREATED', date: selectedExecution.created_at },
                    { label: 'FOLLOWUP_READY', date: selectedExecution.status !== 'PENDING' ? selectedExecution.updated_at : null },
                    { label: 'FOLLOWUP_PROCESSING', date: ['PROCESSING', 'SENT', 'FAILED', 'CANCELED'].includes(selectedExecution.status) ? selectedExecution.updated_at : null },
                    ...(selectedExecution.metadata?.timeline || []).map((t: any) => ({
                      label: t.step,
                      date: t.at
                    })).filter((t: any) => !['FOLLOWUP_PROCESSING', 'FOLLOWUP_CONVERSATION_LOOKUP'].includes(t.label)),
                    { 
                      label: selectedExecution.status === 'CANCELED' ? 'FOLLOWUP_CANCELED' : selectedExecution.status === 'SENT' ? 'FOLLOWUP_SENT' : selectedExecution.status === 'FAILED' ? 'FOLLOWUP_FAILED' : 'FOLLOWUP_WAITING', 
                      date: ['SENT', 'FAILED', 'CANCELED'].includes(selectedExecution.status) ? selectedExecution.completed_at || selectedExecution.updated_at : null 
                    },
                  ].filter((v, i, a) => a.findIndex(t => t.label === v.label) === i) // Unificar steps
                  .sort((a, b) => {
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return new Date(a.date).getTime() - new Date(b.date).getTime();
                  })
                  .map((step, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[31px] top-1 p-1 rounded-full border bg-background ${step.date ? 'border-primary' : 'border-muted'}`}>
                        {step.date || (step.label === 'SENT' && selectedExecution.status === 'SENT') ? (
                          <CheckCircle2 className={`h-3 w-3 ${step.date ? 'text-primary' : 'text-blue-500'}`} />
                        ) : (
                          <div className="h-3 w-3" />
                        )}
                      </div>
                      <div>
                        <p className={`text-[10px] font-bold ${(step.date || (step.label === 'SENT' && selectedExecution.status === 'SENT')) ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {step.label}
                        </p>
                        {step.date ? (
                          <p className="text-[9px] text-muted-foreground">
                            {format(new Date(step.date), "HH:mm:ss", { locale: ptBR })}
                          </p>
                        ) : (
                          <p className="text-[9px] text-muted-foreground italic">
                            {step.label === 'SENT' && selectedExecution.status === 'SENT' ? 'Confirmado' : 'Aguardando...'}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Grid Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Info className="h-3 w-3" /> Dados Técnicos
                </h4>
                
                <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                  <DataField label="Trigger" value={selectedExecution.rule?.name || selectedExecution.reason || "Manual"} />
                  <DataField label="Telefone" value={formatPhone(selectedExecution.phone)} icon={<Phone className="h-3 w-3" />} />
                  <DataField label="Agendado em" value={format(new Date(selectedExecution.scheduled_at), "HH:mm:ss dd/MM")} />
                  <DataField label="Executado em" value={selectedExecution.completed_at ? format(new Date(selectedExecution.completed_at), "HH:mm:ss dd/MM") : (selectedExecution.sent_at ? format(new Date(selectedExecution.sent_at), "HH:mm:ss dd/MM") : "-")} />
                  <DataField label="Worker ID" value={selectedExecution.metadata?.worker_id || "Julia Engine v3"} />
                  <DataField label="Evolution Instance" value={selectedExecution.metadata?.instance_name || selectedExecution.metadata?.evolutionInstance || "Primary"} />
                  <DataField label="Conversation ID" value={selectedExecution.metadata?.conversationId || (selectedExecution.metadata?.conversationCreated ? "Created" : (selectedExecution.metadata?.conversationFound ? "Found" : "-"))} />
                  <DataField label="Message ID" value={selectedExecution.metadata?.message_id || selectedExecution.metadata?.evolution_response?.key?.id || "-"} className="col-span-2" />


                  
                  {selectedExecution.status === 'CANCELED' && (
                    <div className="col-span-2 pt-2 border-t border-border mt-2 space-y-3">
                      <div>
                        <p className="text-[10px] text-amber-600 font-bold uppercase mb-1">Motivo do Cancelamento</p>
                        <div className="bg-amber-500/10 text-amber-700 p-2 rounded-lg border border-amber-500/20 font-bold text-xs flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {selectedExecution.cancel_reason || "UNHANDLED_EXCEPTION"}
                        </div>
                      </div>

                      {/* Phone Diagnosis Metadata */}
                      {(selectedExecution.metadata?.rawPhone || selectedExecution.metadata?.validatorReason) && (
                        <div className="bg-muted/50 rounded-lg p-3 border border-border space-y-2">
                           <p className="text-[10px] text-muted-foreground font-bold uppercase">Auditoria de Telefone</p>
                           <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                 <span className="text-muted-foreground block">RAW PHONE:</span>
                                 <span className="font-mono">{selectedExecution.metadata?.rawPhone || '-'}</span>
                              </div>
                              <div>
                                 <span className="text-muted-foreground block">NORMALIZED:</span>
                                 <span className="font-mono">{selectedExecution.metadata?.normalizedPhone || '-'}</span>
                              </div>
                              <div>
                                 <span className="text-muted-foreground block">VALIDATOR INPUT:</span>
                                 <span className="font-mono">{selectedExecution.metadata?.phoneValidatorInput || '-'}</span>
                              </div>
                              <div>
                                 <span className="text-muted-foreground block">REASON:</span>
                                 <span className="font-bold text-amber-600 uppercase">{selectedExecution.metadata?.validatorReason || '-'}</span>
                              </div>
                           </div>
                        </div>
                      )}

                      {selectedExecution.metadata?.last_error && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 space-y-3 col-span-2">
                          <div className="flex items-center justify-between border-b border-red-500/10 pb-2">
                            <p className="text-[10px] text-red-600 font-bold uppercase flex items-center gap-1">
                              <Bot className="h-3 w-3" /> DIAGNÓSTICO DA FALHA
                            </p>
                            <Badge variant="outline" className="text-[8px] border-red-200 text-red-700 bg-red-50 py-0 h-4">
                              {selectedExecution.metadata.last_error.stage || 'UNHANDLED_EXCEPTION'}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3 text-[10px]">
                            {selectedExecution.metadata.last_error.provider && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">Provider:</span>
                                <span className="font-medium">{selectedExecution.metadata.last_error.provider}</span>
                              </div>
                            )}
                            {selectedExecution.metadata.last_error.model && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">Modelo:</span>
                                <span className="font-medium">{selectedExecution.metadata.last_error.model}</span>
                              </div>
                            )}
                            {(selectedExecution.metadata.last_error.http_status || selectedExecution.metadata.last_error.status) && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">HTTP Status:</span>
                                <span className="font-bold text-red-600">
                                  {selectedExecution.metadata.last_error.http_status || selectedExecution.metadata.last_error.status}
                                </span>
                              </div>
                            )}
                            {selectedExecution.metadata.last_error.error_code && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">Código:</span>
                                <span className="font-mono text-red-700">{selectedExecution.metadata.last_error.error_code}</span>
                              </div>
                            )}
                            {selectedExecution.metadata.last_error.duration_ms && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">Tempo:</span>
                                <span className="font-medium">{selectedExecution.metadata.last_error.duration_ms}ms</span>
                              </div>
                            )}
                            {selectedExecution.metadata.last_error.request_id && (
                              <div>
                                <span className="text-muted-foreground block uppercase text-[8px]">Request ID:</span>
                                <span className="font-mono truncate block">{selectedExecution.metadata.last_error.request_id}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 text-[10px]">
                            <div>
                              <p className="text-[8px] text-muted-foreground uppercase font-bold mb-1">Mensagem:</p>
                              <p className="text-red-700 font-medium leading-relaxed bg-red-500/5 p-2 rounded border border-red-500/10">
                                {selectedExecution.metadata.last_error.message}
                              </p>
                            </div>
                            
                            {(selectedExecution.metadata.last_error.response_body || selectedExecution.metadata.last_error.raw_response) && (
                              <details className="group">
                                <summary className="text-[8px] text-muted-foreground uppercase font-bold mb-1 cursor-pointer hover:text-foreground flex items-center gap-1 list-none">
                                  <ChevronRight className="h-2 w-2 transition-transform group-open:rotate-90" />
                                  Resposta RAW (expandível)
                                </summary>
                                <pre className="mt-2 text-[9px] bg-black/5 p-2 rounded border border-black/5 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono leading-tight">
                                  {JSON.stringify(selectedExecution.metadata.last_error.response_body || selectedExecution.metadata.last_error.raw_response, null, 2)}
                                </pre>
                              </details>
                            )}

                            {(selectedExecution.metadata.last_error.stacktrace || selectedExecution.metadata.last_error.stack) && (
                              <details className="group">
                                <summary className="text-[8px] text-muted-foreground uppercase font-bold mb-1 cursor-pointer hover:text-foreground flex items-center gap-1 list-none">
                                  <ChevronRight className="h-2 w-2 transition-transform group-open:rotate-90" />
                                  Stack Trace (expandível)
                                </summary>
                                <pre className="mt-2 text-[9px] text-muted-foreground whitespace-pre-wrap break-all leading-relaxed bg-black/5 p-2 rounded border border-black/5 max-h-40 overflow-y-auto font-mono">
                                  {selectedExecution.metadata.last_error.stacktrace || selectedExecution.metadata.last_error.stack}
                                </pre>
                              </details>
                            )}
                          </div>
                        </div>
                      )}

                      {selectedExecution.metadata?.dbError && (
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 space-y-2">
                          <p className="text-[10px] text-amber-600 font-bold uppercase flex items-center gap-1">
                            <Database className="h-3 w-3" /> Erro de Banco de Dados
                          </p>
                          <div className="space-y-1 text-[10px] font-mono">
                            <p className="text-amber-700 font-bold">CODE: {selectedExecution.metadata.dbError.code}</p>
                            <p className="text-amber-700 font-bold">MSG: {selectedExecution.metadata.dbError.message}</p>
                            {selectedExecution.metadata.dbError.hint && (
                              <p className="text-muted-foreground">HINT: {selectedExecution.metadata.dbError.hint}</p>
                            )}
                            <p className="text-muted-foreground mt-2 block">PAYLOAD:</p>
                            <pre className="text-[9px] bg-black/5 p-2 rounded max-h-32 overflow-y-auto">
                              {JSON.stringify(selectedExecution.metadata.dbError.payload, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Message Preview */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Conteúdo da Mensagem</h4>
                <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-xs italic text-muted-foreground">
                  {selectedExecution.message_template || selectedExecution.metadata?.generated_message || selectedExecution.metadata?.evolution_response?.message?.conversation || "Mensagem não registrada ou gerada dinamicamente."}
                </div>
              </div>

              {/* Evolution RAW Response */}
              {selectedExecution.metadata?.evolution_response && (
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Resposta da Evolution (Raw Data)</h4>
                  <div className="bg-muted/50 p-4 rounded-xl border border-border/40">
                    <ScrollArea className="h-40">
                      <pre className="text-[10px] font-mono leading-tight text-muted-foreground">
                        {JSON.stringify(selectedExecution.metadata.evolution_response, null, 2)}
                      </pre>
                    </ScrollArea>
                  </div>
                </div>
              )}

            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DataField({ label, value, icon, className }: { label: string, value: string, icon?: React.ReactNode, className?: string }) {
  return (
    <div className={className}>
      <p className="text-[9px] text-muted-foreground uppercase font-bold">{label}</p>
      <p className="text-xs font-medium flex items-center gap-1 truncate">
        {icon} {value}
      </p>
    </div>
  );
}

function FollowupRuleModal({ isOpen, onClose, rule, onSave }: { isOpen: boolean, onClose: () => void, rule: any, onSave: (data: any) => void }) {
  const emptyRule = {
    name: "",
    type: "ABANDONMENT",
    enabled: true,
    delay_amount: 30,
    delay_unit: "MINUTES",
    message_mode: "AI",
    fixed_message: "",
    max_attempts: 3,
    start_time: "08:00",
    end_time: "20:00",
    recipients: ["NEW_CLIENTS"],
    conditions_to_stop: ["REPLY"],
    ai_goal: "BOOKING",
    ai_tone: "HUMAN",
  };

  const [formData, setFormData] = useState<any>(emptyRule);

  useEffect(() => {
    setFormData(rule ? { ...emptyRule, ...rule } : emptyRule);
  }, [rule, isOpen]);

  const handleSave = () => {
    if (!formData.name) {
      toast.error("Preencha o nome da regra");
      return;
    }
    if (formData.message_mode === "FIXED" && !formData.fixed_message) {
      toast.error("Preencha a mensagem fixa");
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? "Editar Regra" : "Nova Regra de Follow-up"}</DialogTitle>
          <DialogDescription>Configure o comportamento da Julia para este gatilho.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label>Nome da Regra</Label>
            <Input 
              placeholder="Ex: Abandono de Agendamento" 
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de Gatilho</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABANDONMENT">Abandono de Fluxo</SelectItem>
                  <SelectItem value="VIP_RECALL">Recall VIP (Inativos)</SelectItem>
                  <SelectItem value="BIRTHDAY">Aniversário</SelectItem>
                  <SelectItem value="POST_SERVICE">Pós-Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="grid gap-2">
                <Label>Tempo de Espera</Label>
                <Input 
                  type="number" 
                  value={formData.delay_amount}
                  onChange={(e) => setFormData({ ...formData, delay_amount: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Unidade</Label>
                <Select value={formData.delay_unit} onValueChange={(v) => setFormData({ ...formData, delay_unit: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MINUTES">Minutos</SelectItem>
                    <SelectItem value="HOURS">Horas</SelectItem>
                    <SelectItem value="DAYS">Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Modo da Mensagem</Label>
              <Select value={formData.message_mode} onValueChange={(v) => setFormData({ ...formData, message_mode: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="AI">Gerada pela Julia (IA)</SelectItem>
                  <SelectItem value="FIXED">Mensagem Fixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Máximo de Tentativas</Label>
              <Input 
                type="number" 
                value={formData.max_attempts}
                onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{formData.message_mode === "FIXED" ? "Mensagem Fixa" : "Instrução para a Julia (opcional)"}</Label>
            <Textarea 
              placeholder="Descreva o que a Julia deve dizer ou escreva a mensagem fixa..." 
              className="h-28"
              value={formData.fixed_message || ""}
              onChange={(e) => setFormData({ ...formData, fixed_message: e.target.value })}
            />
            <p className="text-[10px] text-muted-foreground italic">Use {"{nome}"} para personalizar.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Janela de Envio (início)</Label>
              <Input type="time" value={formData.start_time || "08:00"} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
            </div>
            <div className="grid gap-2">
              <Label>Janela de Envio (fim)</Label>
              <Input type="time" value={formData.end_time || "20:00"} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tom de Voz</Label>
              <Select 
                value={formData.ai_tone} 
                onValueChange={(v) => setFormData({ ...formData, ai_tone: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUMAN">Humanizado & Acolhedor</SelectItem>
                  <SelectItem value="PROFESSIONAL">Profissional & Direto</SelectItem>
                  <SelectItem value="ENTHUSIASTIC">Entusiasta & Alegre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Meta da IA</Label>
              <Select 
                value={formData.ai_goal} 
                onValueChange={(v) => setFormData({ ...formData, ai_goal: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOOKING">Gerar Agendamento</SelectItem>
                  <SelectItem value="FEEDBACK">Coletar Feedback</SelectItem>
                  <SelectItem value="RECOVERY">Recuperar Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Regra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function StatsCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`p-3 rounded-lg bg-background ${color}/10`}><Icon className={`h-5 w-5 ${color}`} /></div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground">{title}</p>
        <p className="text-xl font-bold">{value}</p>
      </div>
    </Card>
  );
}
