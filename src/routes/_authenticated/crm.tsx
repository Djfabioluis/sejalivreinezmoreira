import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listCustomerPipeline, getCRMDashboardStats, listOpportunities, listRecommendations } from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Zap
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
          <h1 className="text-4xl font-display font-bold tracking-tight">CRM Inteligente</h1>
          <p className="text-muted-foreground max-w-lg">Análise comportamental, previsão de churn e automação comercial de alta performance.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Base Ativa</p>
            <p className="text-2xl font-bold">{customers.length}</p>
          </div>
          <Button className="shadow-lg shadow-primary/20 gap-2">
            <Plus className="h-4 w-4" /> Gerar Campanha
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
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Oportunidades Identificadas (IA)</h2>
          <ScrollArea className="h-[600px] rounded-md border p-4">
            <div className="space-y-4">
              {opportunities.length > 0 ? (
                opportunities.map((opp: any) => (
                  <Card key={opp.id} className={`border-l-4 ${opp.opportunity_type === 'WAITING_LIST' ? 'border-l-purple-500 bg-purple-50/20' : opp.metadata?.is_premium_decision ? 'border-l-amber-500 bg-amber-50/10' : 'border-l-blue-500'}`}>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant={opp.opportunity_type === 'WAITING_LIST' ? 'secondary' : opp.metadata?.is_premium_decision ? 'default' : 'outline'} className={`mb-1 ${opp.metadata?.is_premium_decision ? 'bg-amber-600 hover:bg-amber-700' : ''}`}>
                            {opp.opportunity_type === 'WAITING_LIST' ? 'LISTA DE ESPERA 💜' : opp.metadata?.is_premium_decision ? 'CAMPANHA PREMIUM ⭐' : opp.opportunity_type.replace(/_/g, ' ')}
                          </Badge>
                          <CardTitle className="text-sm">{opp.customer_id}</CardTitle>
                        </div>
                        <Badge className={`${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'} hover:opacity-80 border-none`}>
                          Score: {opp.score}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground italic">"{opp.trigger}"</p>
                      {opp.metadata?.is_premium_decision && (
                        <div className="text-[10px] font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded mb-1">
                          Público: {opp.metadata.target_audience}
                        </div>
                      )}
                      <div className={`${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-50 border-purple-100' : opp.metadata?.is_premium_decision ? 'bg-amber-50 border-amber-100' : 'bg-blue-50/50 border-blue-100'} p-2 rounded text-[11px] border`}>
                        <strong>{opp.metadata?.is_premium_decision ? 'Sugestão de Mensagem:' : 'Ação Recomendada:'}</strong> {opp.recommended_action}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        {opp.opportunity_type === 'WAITING_LIST' && (
                           <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700 border-green-200">
                             RECUPERAÇÃO DE SLOT
                           </Badge>
                        )}
                        <div className="flex gap-2 items-center ml-auto">
                          {opp.metadata?.is_premium_decision && opp.status === 'PENDENTE' && (
                            <Badge className="bg-amber-600 text-[9px] cursor-pointer hover:bg-amber-700">APROVAR CAMPANHA</Badge>
                          )}
                          <Badge variant="secondary" className="text-[9px] uppercase">{opp.status}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-10 text-muted-foreground italic">Nenhuma oportunidade pendente.</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">IA Comercial: Sugestões de Venda</h2>
          <ScrollArea className="h-[300px] rounded-md border p-4 bg-green-50/5">
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

          <h2 className="text-xl font-semibold pt-4">Funil de Vendas (Pipeline)</h2>
          <ScrollArea className="h-[600px] rounded-md border p-4">
            <div className="grid gap-4">
              {customers.map((customer: any) => (
            <Card key={customer.phone} className="overflow-hidden border-t-4 border-t-transparent relative">
              <div className={`absolute top-0 right-0 px-2 py-0.5 text-[8px] font-bold rounded-bl ${getHealthColorClass(customer.health_status || 'AMARELO')}`}>
                HEALTH: {customer.health_status || 'AMARELO'}
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{customer.customer_name || customer.phone}</CardTitle>
                    <p className="text-xs text-muted-foreground">{customer.phone}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] uppercase">
                    {customer.current_stage.replace(/_/g, " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-[10px]">
                    <p className="font-bold text-muted-foreground uppercase">Perfil Cliente</p>
                    <p>Frequência: {customer.frequency_days || 28} dias</p>
                    <p>Último atendimento: {customer.last_visit_at ? formatDistanceToNow(new Date(customer.last_visit_at), { locale: ptBR }) : '15 dias'}</p>
                    <p className="text-emerald-600 font-bold">Receita: R$ {customer.total_revenue || '12.480'}</p>
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <p className="font-bold text-muted-foreground uppercase">Preferências</p>
                    <p>Profissional: {customer.favorite_professional || 'Juliana'}</p>
                    <p>Serviços: {customer.last_services?.join(', ') || 'Escova, Manicure'}</p>
                    <p className="text-indigo-600 font-bold">Plano: {customer.plan_name || 'Beauty'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span>Conversão</span>
                      <span>{customer.conversion_score || 0}%</span>
                    </div>
                    <Progress value={customer.conversion_score || 0} className="h-1.5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium">
                      <span>Health Score</span>
                      <span>{customer.health_score || 0}%</span>
                    </div>
                    <Progress value={customer.health_score || 0} className="h-1.5" />
                  </div>
                </div>

                {customer.health_recommendations && customer.health_recommendations.length > 0 && (
                  <div className="space-y-1 bg-muted/30 p-2 rounded border border-dashed">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter flex items-center gap-1">
                      <Sparkles className="h-2 w-2 text-indigo-500" /> IA Recomenda:
                    </p>
                    <ul className="text-[9px] space-y-0.5 list-none">
                      {customer.health_recommendations.map((rec: string, i: number) => (
                        <li key={i} className="flex items-start gap-1">
                          <Check className="h-2 w-2 mt-0.5 text-green-600" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t">
                  <div className="flex flex-col">
                    <span>Próxima Previsão: {customer.next_visit_prediction ? new Date(customer.next_visit_prediction).toLocaleDateString('pt-BR') : '13 dias'}</span>
                  </div>
                  <div className="text-right">
                    <span>Interação: {customer.last_interaction_at 
                      ? formatDistanceToNow(new Date(customer.last_interaction_at), { addSuffix: true, locale: ptBR })
                      : "Nunca"}</span>
                  </div>
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
