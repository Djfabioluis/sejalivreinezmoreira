import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listCustomerPipeline, getCRMDashboardStats, listOpportunities, listRecommendations } from "@/lib/crm.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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
    <div className="container mx-auto p-4 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Inteligente</h1>
          <p className="text-muted-foreground">Visão geral do funil e saúde da base de clientes.</p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          {customers.length} Clientes no Funil
        </Badge>
      </div>

      {/* Dashboard Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Bloco 1: Operacional Principal */}
        <StatCard title="Taxa de Conversão" value={`${stats.conversionRate.toFixed(1)}%`} description="Lead -> Atendimento" color="text-blue-600" />
        <StatCard title="Agendamentos Concluídos" value={stats.concludedAppointments} description="Total de conversões" color="text-green-600" />
        <StatCard title="Agendamentos Iniciados" value={stats.startedAppointments} description="Interações totais" />
        <StatCard title="Agendamentos Abandonados" value={stats.abandonedAppointments} description="Pararam no fluxo" color="text-red-600" />

        {/* Bloco 2: Dashboard Financeiro (NOVO) */}
        <StatCard title="Receita Recuperada" value={`R$ ${stats.estimatedRevenueRecovered}`} description="Total Julia + Follow-up" color="text-emerald-600" />
        <StatCard title="Receita Perdida" value={`R$ ${stats.lostRevenue}`} description="Estimativa de cancelamentos" color="text-rose-600" />
        <StatCard title="Receita Follow-up" value={`R$ ${stats.revenueFromFollowUp}`} description="Recuperado via retorno" />
        <StatCard title="Receita IA Julia" value={`R$ ${stats.revenueFromIA}`} description="Recuperado via Revenue Engine" color="text-purple-600" />

        <StatCard title="Ticket Médio" value={`R$ ${stats.ticketMedio.toFixed(0)}`} description="Média por atendimento" />
        <StatCard title="Taxa de Ocupação" value={`${stats.occupancyRate}%`} description="Capacidade da agenda" color="text-blue-500" />
        <StatCard title="Tempo Recuperação" value={stats.avgTimeUntilFill} description="Média para preencher cancelamento" />
        <StatCard title="Horários Recuperados" value={stats.recoveredSlotsCount} description="Slots de cancelamento reocupados" color="text-emerald-500" />

        {/* Bloco 3: Saúde da Base */}
        <StatCard title="Clientes VIP" value={stats.vipCustomers} description="Score acima de 90%" color="text-indigo-600" />
        <StatCard title="Clientes Inativos" value={stats.inactiveCustomers} description="Sem contato há 60 dias+" />
        <StatCard title="Clientes em Risco" value={stats.atRiskCustomers} description="Baixo score + Abandono" color="text-orange-600" />
        <StatCard title="Planos Ativos" value={stats.activePlans} description="Assinaturas vigentes" />

        {/* Bloco 4: Breakdown Financeiro por Unidade/Profissional */}
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium">Receita por Unidade</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xs space-y-1">
              {Object.entries(stats.revenueByUnit).length > 0 ? (
                Object.entries(stats.revenueByUnit).map(([unit, revenue]) => (
                  <div key={unit} className="flex justify-between">
                    <span className="truncate mr-2">{unit}</span>
                    <span className="font-bold text-emerald-600">R$ {String(revenue)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic text-[10px]">Sem dados financeiros</p>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium">Receita por Profissional</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xs space-y-1">
              {Object.entries(stats.revenueByProfessional).length > 0 ? (
                Object.entries(stats.revenueByProfessional).map(([prof, revenue]) => (
                  <div key={prof} className="flex justify-between">
                    <span className="truncate mr-2">{prof}</span>
                    <span className="font-bold text-emerald-600">R$ {String(revenue)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic text-[10px]">Sem dados financeiros</p>
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
                          <Badge variant={opp.opportunity_type === 'WAITING_LIST' ? 'secondary' : 'outline'} className="mb-1">
                            {opp.opportunity_type === 'WAITING_LIST' ? 'LISTA DE ESPERA 💜' : opp.opportunity_type.replace(/_/g, ' ')}
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
                      <div className={`${opp.opportunity_type === 'WAITING_LIST' ? 'bg-purple-50 border-purple-100' : 'bg-blue-50/50 border-blue-100'} p-2 rounded text-[11px] border`}>
                        <strong>Ação Recomendada:</strong> {opp.recommended_action}
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        {opp.opportunity_type === 'WAITING_LIST' && (
                           <Badge variant="outline" className="text-[8px] bg-green-50 text-green-700 border-green-200">
                             RECUPERAÇÃO DE SLOT
                           </Badge>
                        )}
                        <Badge variant="secondary" className="text-[9px] uppercase ml-auto">{opp.status}</Badge>
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
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">Recomendações da Julia:</p>
                    <div className="flex flex-wrap gap-1">
                      {customer.health_recommendations.map((rec: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-[8px] py-0 leading-tight border-dashed">
                          {rec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t">
                  <div className="flex flex-col">
                    <span>Última visita: {customer.last_visit_at ? new Date(customer.last_visit_at).toLocaleDateString('pt-BR') : 'Sem dados'}</span>
                    <span>Cancelamentos: {customer.total_cancellations || 0}</span>
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
