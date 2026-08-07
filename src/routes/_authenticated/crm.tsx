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
  getFollowupStats,
  saveFollowupRule,
  deleteFollowupRule,
  runFollowupTest,
  getWorkerStatus

} from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  Plus, Search, TrendingUp, Users, Clock, DollarSign, Target, Sparkles,
  ChevronRight, Zap, Loader2, Settings, History, LayoutDashboard,
  Play, Pause, Edit2, Trash2, Copy, MessageSquare, Bot
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
      context.queryClient.ensureQueryData({ queryKey: ["followup-stats"], queryFn: () => getFollowupStats() }),
    ]);
  },
  component: CRMPage,
});

function CRMPage() {
  const queryClient = useQueryClient();
  const saveRuleFn = useServerFn(saveFollowupRule);
  const deleteRuleFn = useServerFn(deleteFollowupRule);
  
  const { data: pipeline } = useSuspenseQuery({ queryKey: ["crm-pipeline"], queryFn: () => listCustomerPipeline() });
  const { data: stats } = useSuspenseQuery({ queryKey: ["crm-stats"], queryFn: () => getCRMDashboardStats() });
  const { data: rules } = useSuspenseQuery({ queryKey: ["followup-rules"], queryFn: () => listFollowupRules() });
  const { data: history } = useSuspenseQuery({ queryKey: ["followup-history"], queryFn: () => listFollowupHistory() });
  const { data: fStats } = useSuspenseQuery({ queryKey: ["followup-stats"], queryFn: () => getFollowupStats() });

  const [activeTab, setActiveTab] = useState("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<any>(null);

  const handleSaveRule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      id: editingRule?.id,
      name: formData.get("name"),
      type: formData.get("type"),
      delay_amount: parseInt(formData.get("delay_amount") as string),
      delay_unit: formData.get("delay_unit"),
      message_mode: formData.get("message_mode"),
      fixed_message: formData.get("fixed_message"),
      start_time: formData.get("start_time"),
      end_time: formData.get("end_time"),
      max_attempts: parseInt(formData.get("max_attempts") as string),
      enabled: true
    };

    try {
      await saveRuleFn({ data });

      toast.success("Regra salva com sucesso!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["followup-rules"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta regra?")) return;
    try {
      await deleteRuleFn({ data: { id } });
      toast.success("Regra excluída!");
      queryClient.invalidateQueries({ queryKey: ["followup-rules"] });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-3">
            CRM & Automação
          </Badge>
          <h1 className="text-4xl font-display font-bold tracking-tight">Follow-up Inteligente</h1>
          <p className="text-muted-foreground max-w-lg">Gerencie réguas de contato automáticas e recupere agendamentos com IA.</p>
        </div>
        <Button onClick={() => { setEditingRule(null); setIsModalOpen(true); }} className="shadow-lg shadow-primary/20 gap-2">
          <Plus className="h-4 w-4" /> Nova Regra
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg gap-2"><Settings className="h-4 w-4" /> Regras Ativas</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg gap-2"><Settings className="h-4 w-4" /> Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard title="Follow-ups Pendentes" value={fStats.pending} icon={Clock} color="text-amber-500" />
            <StatsCard title="Enviados Hoje" value={fStats.sentToday} icon={Zap} color="text-primary" />
            <StatsCard title="Taxa de Resposta" value="18.5%" icon={MessageSquare} color="text-emerald-500" />
            <StatsCard title="Recuperados" value={fStats.recovered} icon={TrendingUp} color="text-emerald-600" />
          </div>
          
          <div className="grid gap-8 lg:grid-cols-2">
             <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Desempenho de Recuperação
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground italic">
                  Gráfico de tendência em desenvolvimento...
                </CardContent>
             </Card>
             <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> Clientes mais impactados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <ScrollArea className="h-[250px]">
                      {pipeline.slice(0, 5).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between p-3 border-b border-border/40 last:border-0">
                           <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                                  {c.phone?.slice(-2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                 <p className="text-xs font-bold">{c.phone}</p>
                                 <p className="text-[10px] text-muted-foreground">{c.current_stage}</p>
                              </div>
                           </div>
                           <Badge variant="outline" className="text-[9px]">{c.health_score} pts</Badge>
                        </div>
                      ))}
                   </ScrollArea>
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="grid gap-4">
            {rules.map((rule: any) => (
              <Card key={rule.id} className="border-none shadow-md overflow-hidden group">
                <div className="flex items-center p-6 gap-6">
                  <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${rule.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    {rule.type === 'ABANDONMENT' ? <Bot className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm truncate">{rule.name}</h3>
                      <Badge variant={rule.enabled ? "default" : "secondary"} className="text-[9px] uppercase">{rule.enabled ? 'Ativa' : 'Pausada'}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {rule.delay_amount} {rule.delay_unit}</span>
                      <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {rule.message_mode}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Play className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRule(rule); setIsModalOpen(true); }}><Edit2 className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteRule(rule.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                   <thead className="bg-muted/50 uppercase tracking-widest font-bold text-[10px] text-muted-foreground border-b border-border/40">
                      <tr>
                         <th className="px-6 py-4">Telefone</th>
                         <th className="px-6 py-4">Regra</th>
                         <th className="px-6 py-4">Mensagem</th>
                         <th className="px-6 py-4">Data</th>
                         <th className="px-6 py-4">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                           <td className="px-6 py-4 font-bold">{h.phone}</td>
                           <td className="px-6 py-4">{h.rule?.name || 'Manual'}</td>
                           <td className="px-6 py-4 max-w-xs truncate">{h.message_template}</td>
                           <td className="px-6 py-4 text-muted-foreground">{format(new Date(h.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className={`text-[9px] ${h.status === 'SENT' ? 'border-emerald-500/20 text-emerald-600' : 'border-amber-500/20 text-amber-600'}`}>
                                 {h.status}
                              </Badge>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </Card>
        </TabsContent>
        
        <TabsContent value="config">
           <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
                 <CardHeader>
                    <CardTitle className="text-sm font-bold uppercase tracking-wider">Limites de Envio</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                       <Label className="text-xs">Janela de Envio (Início)</Label>
                       <Input type="time" defaultValue="08:00" className="w-32 h-8" />
                    </div>
                    <div className="flex justify-between items-center">
                       <Label className="text-xs">Janela de Envio (Fim)</Label>
                       <Input type="time" defaultValue="20:00" className="w-32 h-8" />
                    </div>
                    <div className="flex justify-between items-center">
                       <Label className="text-xs">Máximo Follow-ups por cliente</Label>
                       <Input type="number" defaultValue="3" className="w-32 h-8" />
                    </div>
                    <Button size="sm" className="w-full mt-4">Salvar Configurações</Button>
                 </CardContent>
              </Card>
           </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Follow-up'}</DialogTitle>
            <DialogDescription>Configure os gatilhos e mensagens automáticas da Julia.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveRule} className="space-y-6 pt-4">
             <div className="space-y-2">
                <Label htmlFor="name">Nome da Regra</Label>
                <Input id="name" name="name" defaultValue={editingRule?.name} placeholder="Ex: Cliente parou no agendamento" required />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="type">Tipo</Label>
                   <Select name="type" defaultValue={editingRule?.type || 'ABANDONMENT'}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                         <SelectItem value="ABANDONMENT">Abandono de Fluxo</SelectItem>
                         <SelectItem value="VIP">Cliente VIP</SelectItem>
                         <SelectItem value="BIRTHDAY">Aniversário</SelectItem>
                         <SelectItem value="CUSTOM">Personalizada</SelectItem>
                      </SelectContent>
                   </Select>
                </div>
                <div className="space-y-2">
                   <Label>Tempo de Espera</Label>
                   <div className="flex gap-2">
                      <Input name="delay_amount" type="number" defaultValue={editingRule?.delay_amount || 30} className="flex-1" />
                      <Select name="delay_unit" defaultValue={editingRule?.delay_unit || 'MINUTES'}>
                         <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                         <SelectContent>
                            <SelectItem value="MINUTES">Min</SelectItem>
                            <SelectItem value="HOURS">Horas</SelectItem>
                            <SelectItem value="DAYS">Dias</SelectItem>
                         </SelectContent>
                      </Select>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <Label>Modo de Mensagem</Label>
                <RadioGroup name="message_mode" defaultValue={editingRule?.message_mode || 'AI'} className="grid grid-cols-2 gap-4">
                   <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="AI" id="mode-ai" />
                      <Label htmlFor="mode-ai" className="flex items-center gap-2 cursor-pointer"><Bot className="h-4 w-4" /> Inteligência Julia</Label>
                   </div>
                   <div className="flex items-center space-x-2 border rounded-lg p-3 hover:bg-accent cursor-pointer">
                      <RadioGroupItem value="FIXED" id="mode-fixed" />
                      <Label htmlFor="mode-fixed" className="flex items-center gap-2 cursor-pointer"><MessageSquare className="h-4 w-4" /> Mensagem Fixa</Label>
                   </div>
                </RadioGroup>
             </div>

             <div className="space-y-2">
                <Label htmlFor="fixed_message">Mensagem (opcional para IA)</Label>
                <Textarea id="fixed_message" name="fixed_message" defaultValue={editingRule?.fixed_message} placeholder="Use {{nome}} para personalizar" className="h-24" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <Label htmlFor="start_time">Janela Início</Label>
                   <Input id="start_time" name="start_time" type="time" defaultValue={editingRule?.start_time || "08:00"} />
                </div>
                <div className="space-y-2">
                   <Label htmlFor="end_time">Janela Fim</Label>
                   <Input id="end_time" name="end_time" type="time" defaultValue={editingRule?.end_time || "20:00"} />
                </div>
             </div>

             <DialogFooter className="gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit">Salvar e Ativar</Button>
             </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm group hover:scale-[1.02] transition-transform">
      <CardHeader className="pb-2">
        <CardDescription className="uppercase tracking-wider text-[10px] font-bold">{title}</CardDescription>
        <CardTitle className="text-3xl font-display font-bold flex items-center justify-between">
          {value}
          <Icon className={`h-6 w-6 ${color} opacity-20 group-hover:opacity-40 transition-opacity`} />
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
