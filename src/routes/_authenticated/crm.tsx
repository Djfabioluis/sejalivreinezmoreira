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
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  Plus, Clock, Zap, MessageSquare, Bot, Sparkles, Settings, History, LayoutDashboard,
  Play, Edit2, Trash2, Loader2, PlayCircle, Activity
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
      <div className="flex items-center justify-between p-4 bg-card rounded-xl border border-border/50 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="bg-emerald-500/10 p-2 rounded-full">
             <Activity className="h-5 w-5 text-emerald-600 animate-pulse" />
           </div>
           <div>
             <h3 className="text-sm font-bold">Motor de Follow-up <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-none">ONLINE</Badge></h3>
             <p className="text-[10px] text-muted-foreground">Fila: {workerStatus.queueSize} | Última: {workerStatus.lastRun}</p>
           </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted/50 p-1 rounded-xl mb-6">
          <TabsTrigger value="dashboard" className="rounded-lg gap-2"><LayoutDashboard className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg gap-2"><Settings className="h-4 w-4" /> Regras Ativas</TabsTrigger>
          <TabsTrigger value="executions" className="rounded-lg gap-2"><PlayCircle className="h-4 w-4" /> Execuções</TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg gap-2"><History className="h-4 w-4" /> Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="executions" className="space-y-4">
           <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                   <thead className="bg-muted/50 uppercase tracking-widest font-bold text-[10px] text-muted-foreground border-b border-border/40">
                      <tr>
                         <th className="px-6 py-4">Telefone</th>
                         <th className="px-6 py-4">Regra</th>
                         <th className="px-6 py-4">Agendado</th>
                         <th className="px-6 py-4">Tentativas</th>
                         <th className="px-6 py-4">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {executions.map((e: any) => (
                        <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                           <td className="px-6 py-4 font-bold">{e.phone}</td>
                           <td className="px-6 py-4">{e.rule?.name || 'Manual'}</td>
                           <td className="px-6 py-4 text-muted-foreground">{format(new Date(e.scheduled_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                           <td className="px-6 py-4">{e.attempts || 0}/3</td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className={`text-[9px] uppercase ${e.status === 'PROCESSING' ? 'border-blue-500/20 text-blue-600 animate-pulse' : 'border-amber-500/20 text-amber-600'}`}>
                                 {e.status}
                              </Badge>
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
                         <th className="px-6 py-4">Telefone</th>
                         <th className="px-6 py-4">Regra</th>
                         <th className="px-6 py-4">Mensagem</th>
                         <th className="px-6 py-4">Concluído</th>
                         <th className="px-6 py-4">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/40">
                      {history.map((h: any) => (
                        <tr key={h.id} className="hover:bg-muted/20 transition-colors">
                           <td className="px-6 py-4 font-bold">{h.phone}</td>
                           <td className="px-6 py-4">{h.rule?.name || 'Manual'}</td>
                           <td className="px-6 py-4 max-w-xs truncate">{h.message_template}</td>
                           <td className="px-6 py-4 text-muted-foreground">{format(new Date(h.completed_at || h.created_at), 'dd/MM HH:mm', { locale: ptBR })}</td>
                           <td className="px-6 py-4">
                              <Badge variant="outline" className={`text-[9px] uppercase ${h.status === 'SENT' ? 'border-emerald-500/20 text-emerald-600' : 'border-red-500/20 text-red-600'}`}>
                                 {h.status}
                              </Badge>
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
    </div>
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
