import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { 
  listCustomerPipeline, 
  getCRMDashboardStats, 
  listOpportunities, 
  listRecommendations,
  triggerCampaignGeneration 
} from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { 
  Plus, 
  Search, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  Sparkles,
  Check,
  ChevronRight,
  Filter,
  ArrowRight,
  Zap,
  Loader2
} from "lucide-react";


export const Route = createFileRoute("/_authenticated/crm")({
  head: () => ({
    meta: [{ title: "CRM Inteligente — Julia" }],
  }),
  loader: async ({ context }) => {
    const [pipeline, stats, opportunities, recommendations] = await Promise.all([
      context.queryClient.ensureQueryData({
        queryKey: ["crm-pipeline"],
        queryFn: () => listCustomerPipeline(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["crm-stats"],
        queryFn: () => getCRMDashboardStats(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["crm-opportunities"],
        queryFn: () => listOpportunities(),
      }),
      context.queryClient.ensureQueryData({
        queryKey: ["crm-recommendations"],
        queryFn: () => listRecommendations(),
      }),
    ]);
    return { pipeline, stats, opportunities, recommendations };
  },
  component: CRMPage,
});

function CRMPage() {
  const queryClient = useQueryClient();
  const generateCampaignFn = useServerFn(triggerCampaignGeneration);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: customers } = useSuspenseQuery({
    queryKey: ["crm-pipeline"],
    queryFn: () => listCustomerPipeline(),
  });

  const { data: stats } = useSuspenseQuery({
    queryKey: ["crm-stats"],
    queryFn: () => getCRMDashboardStats(),
  });

  const { data: opportunities } = useSuspenseQuery({
    queryKey: ["crm-opportunities"],
    queryFn: () => listOpportunities(),
  });

  const { data: recommendations } = useSuspenseQuery({
    queryKey: ["crm-recommendations"],
    queryFn: () => listRecommendations(),
  });

  const handleGenerateCampaign = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    console.log("[crm] generate_campaign_click");
    
    try {
      console.log("[crm] generate_campaign_request_started");
      const result = await generateCampaignFn();
      
      if (result.success) {
        console.log("[crm] generate_campaign_request_completed");
        toast.success("Campanha gerada com sucesso!");
        
        // Invalidate queries to refresh the UI
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["crm-recommendations"] }),
          queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] }),
          queryClient.invalidateQueries({ queryKey: ["crm-stats"] })
        ]);
        console.log("[crm] generate_campaign_ui_updated");
      }
    } catch (error: any) {
      console.error("[crm] generate_campaign_failed", error);
      toast.error(error.message || "Erro ao gerar campanha. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };


  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  const getHealthColorClass = (status: string) => {
    switch (status) {
      case 'VERDE': return 'bg-green-100 text-green-700 border-green-200';
      case 'AMARELO': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'VERMELHO': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold uppercase tracking-[0.2em] mb-2 px-3">
            Inteligência de Vendas
          </Badge>
          <h1 className="text-4xl font-display font-bold tracking-tight">Seja Livre AI Platform</h1>
          <p className="text-muted-foreground max-w-lg">CRM Inteligente: Análise comportamental, previsão de churn e automação comercial.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Ativa</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>
          <Button 
            className="shadow-lg shadow-primary/20 gap-2 min-w-[160px]" 
            onClick={handleGenerateCampaign}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" /> Gerar Campanha
              </>
            )}
          </Button>
        </div>
      </div>


      {/* Dashboard Stats Grid */}
      {/* Dashboard Stats Grid Premium */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary border-none shadow-2xl shadow-primary/20 text-primary-foreground overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
            <DollarSign className="h-12 w-12" />
          </div>
          <CardHeader className="pb-2">
            <CardDescription className="text-primary-foreground/70 font-medium uppercase tracking-wider text-[10px]">Receita Recuperada</CardDescription>
            <CardTitle className="text-3xl font-display font-bold">R$ {stats.estimatedRevenueRecovered}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs font-medium text-primary-foreground/80">
              <TrendingUp className="h-3 w-3" />
              <span>+12.5% vs mês anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm group">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider text-[10px] font-bold">Taxa de Conversão</CardDescription>
            <CardTitle className="text-3xl font-display font-bold">{stats.conversionRate.toFixed(1)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats.conversionRate} className="h-1.5 bg-secondary" />
            <p className="text-[10px] text-muted-foreground mt-2 font-medium">Lead → Atendimento concluído</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider text-[10px] font-bold">Ticket Médio</CardDescription>
            <CardTitle className="text-3xl font-display font-bold">R$ {stats.ticketMedio.toFixed(0)}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold">ESTÁVEL</Badge>
              <span className="text-[10px] text-muted-foreground font-medium">Média por atendimento</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardDescription className="uppercase tracking-wider text-[10px] font-bold">Ocupação Julia</CardDescription>
            <CardTitle className="text-3xl font-display font-bold">{stats.occupancyRate}%</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-5 w-5 rounded-full border-2 border-background bg-secondary flex items-center justify-center text-[8px] font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground font-medium">Capacidade da agenda otimizada</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Financeiro Premium */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Receita por Unidade</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {Object.entries(stats.revenueByUnit).length > 0 ? (
                Object.entries(stats.revenueByUnit).map(([unit, revenue]) => (
                  <div key={unit} className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors">
                    <span className="text-xs font-medium text-slate-600 truncate mr-2">{unit}</span>
                    <Badge variant="outline" className="border-primary/20 text-primary font-bold">R$ {String(revenue)}</Badge>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground italic text-xs">Sem dados financeiros por unidade</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-bold uppercase tracking-wider">Performance Profissional</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {Object.entries(stats.revenueByProfessional).length > 0 ? (
                Object.entries(stats.revenueByProfessional).map(([prof, revenue]) => (
                  <div key={prof} className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors">
                    <span className="text-xs font-medium text-slate-600 truncate mr-2">{prof}</span>
                    <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 font-bold">R$ {String(revenue)}</Badge>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-muted-foreground italic text-xs">Sem dados financeiros por profissional</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Oportunidades de Alta Conversão
            </h2>
            <Badge variant="outline" className="text-[10px]">{opportunities.length} detectadas</Badge>
          </div>
          <ScrollArea className="h-[600px] rounded-2xl border-none shadow-inner bg-secondary/20 p-4">
            <div className="space-y-4">
              {opportunities.length > 0 ? (
                opportunities.map((opp: any) => (
                  <Card key={opp.id} className={`border-none shadow-md relative overflow-hidden group transition-all hover:shadow-lg ${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-500/5' : opp.metadata?.is_premium_decision ? 'bg-amber-500/5' : 'bg-card'}`}>
                    <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-500' : opp.metadata?.is_premium_decision ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <Badge variant="secondary" className={`text-[9px] font-bold uppercase tracking-wider ${opp.metadata?.is_premium_decision ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                            {opp.opportunity_type === 'WAITING_LIST' ? 'Lista de Espera 💜' : opp.metadata?.is_premium_decision ? 'Campanha Premium ⭐' : opp.opportunity_type.replace(/_/g, ' ')}
                          </Badge>
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            {opp.customer_id}
                          </CardTitle>
                        </div>
                        <div className="text-right">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase">Score</p>
                          <p className="text-lg font-display font-bold text-primary">{opp.score}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-3 rounded-xl bg-card/50 border border-border/40 text-xs italic text-muted-foreground leading-relaxed">
                        "{opp.trigger}"
                      </div>
                      
                      <div className={`p-3 rounded-xl border ${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-500/10 border-purple-500/20' : 'bg-primary/5 border-primary/10'}`}>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Ação Recomendada</p>
                        <p className="text-[11px] leading-relaxed font-medium">{opp.recommended_action}</p>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border/40">
                        <Badge variant="secondary" className="text-[8px] font-bold">{opp.status}</Badge>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 group-hover:translate-x-1 transition-transform">
                          Executar <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                  <Clock className="h-8 w-8 opacity-20" />
                  <p className="text-sm italic">Buscando novas oportunidades...</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> IA Comercial: Next Best Action
            </h2>
          </div>
          <ScrollArea className="h-[300px] rounded-2xl border-none shadow-inner bg-primary/5 p-4">
            <div className="space-y-4">
              {recommendations.length > 0 ? (
                recommendations.map((rec: any) => (
                  <Card key={rec.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-none text-[9px] font-bold">
                        {rec.recommendation_type}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-muted-foreground">{rec.confidence}% Match</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs font-bold">{rec.customer_id}</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 italic">"{rec.reason}"</p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground italic text-xs">Aguardando sinais do mercado...</div>
              )}
            </div>
          </ScrollArea>

          <div className="flex items-center justify-between pt-4">
            <h2 className="text-xl font-display font-bold">Pipeline de Clientes</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg"><Search className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg"><Filter className="h-4 w-4" /></Button>
            </div>
          </div>
          <ScrollArea className="h-[600px] rounded-2xl border-none shadow-inner bg-secondary/20 p-4">
            <div className="space-y-3">
              {recommendations.length > 0 ? (
                recommendations.map((rec: any) => (
                  <Card key={rec.id} className="border-l-4 border-l-green-500">
                    <CardHeader className="p-3 pb-1">
                      <div className="flex justify-between items-center">
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none text-[10px]">
                          {rec.recommendation_type}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Confiança: {rec.confidence}%</span>
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-1 space-y-2">
                      <CardTitle className="text-xs">{rec.customer_id}</CardTitle>
                      <p className="text-[11px] text-muted-foreground italic">"{rec.reason}"</p>
                      <div className="bg-green-50 p-2 rounded text-[11px] border border-green-100">
                        {rec.suggested_message}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground italic text-sm">Nenhuma recomendação gerada ainda.</div>
              )}
            </div>
          </ScrollArea>

          <ScrollArea className="h-[600px] rounded-2xl border-none shadow-inner bg-secondary/20 p-4">
            <div className="grid gap-6">
              {customers.map((customer: any) => (
                <Card key={customer.phone} className="overflow-hidden border-none shadow-md group hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm">
                  <div className={`h-1.5 w-full ${getScoreColor(customer.health_score || 50)}`} />
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/10 group-hover:border-primary/30 transition-colors">
                          <AvatarFallback className="bg-primary/5 text-primary font-bold">
                            {(customer.customer_name || 'C').substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{customer.customer_name || customer.phone}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-[9px] font-bold py-0 h-4 border-primary/20 text-primary">
                              {customer.current_stage.replace(/_/g, " ")}
                            </Badge>
                            <Badge className={`text-[9px] font-bold py-0 h-4 border-none ${getHealthColorClass(customer.health_status || 'AMARELO')}`}>
                              SAÚDE {customer.health_status || 'AMARELO'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Valor Acumulado</p>
                        <p className="text-xl font-display font-bold text-emerald-600">R$ {customer.total_revenue || '0'}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-0">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 rounded-xl bg-secondary/30">
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Frequência</p>
                        <p className="text-xs font-bold">{customer.frequency_days || 28} dias</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Última Visita</p>
                        <p className="text-xs font-bold">{customer.last_visit_at ? formatDistanceToNow(new Date(customer.last_visit_at), { locale: ptBR }) : '15 dias'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Profissional</p>
                        <p className="text-xs font-bold">{customer.favorite_professional || 'Qualquer'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Plano</p>
                        <Badge variant="secondary" className="text-[9px] font-bold bg-primary/10 text-primary border-none">
                          {customer.plan_name || 'Sem Plano'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Conversão</span>
                          <span className="text-primary">{customer.conversion_score || 0}%</span>
                        </div>
                        <Progress value={customer.conversion_score || 0} className="h-2 bg-secondary" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                          <span>Health Score</span>
                          <span className="text-emerald-500">{customer.health_score || 0}%</span>
                        </div>
                        <Progress value={customer.health_score || 0} className="h-2 bg-secondary" />
                      </div>
                    </div>

                    {customer.health_recommendations && customer.health_recommendations.length > 0 && (
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 relative overflow-hidden group/rec">
                        <div className="absolute top-0 right-0 p-2 opacity-10">
                          <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-2 mb-3">
                          <Zap className="h-3 w-3 fill-primary" /> IA Recomenda
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {customer.health_recommendations.map((rec: string, i: number) => (
                            <div key={i} className="flex items-start gap-2 text-[11px] font-medium leading-tight text-slate-700">
                              <Check className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
                              {rec}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] font-bold text-muted-foreground pt-4 border-t border-border/40">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>PREVISÃO: {customer.next_visit_prediction ? new Date(customer.next_visit_prediction).toLocaleDateString('pt-BR') : '13 dias'}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-2 font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        ABRIR PERFIL <ArrowRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      
      {customers.length === 0 && (
        <div className="text-center py-20 opacity-50">
          <p>Nenhum cliente no pipeline no momento.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, description, color }: { title: string, value: string | number, description: string, color?: string }) {
  return (
    <Card>
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-2">
        <div className={`text-2xl font-bold ${color || ''}`}>{value}</div>
        <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
