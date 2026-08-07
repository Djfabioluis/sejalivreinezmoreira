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
                </div>
              </Card>
            ))}
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
