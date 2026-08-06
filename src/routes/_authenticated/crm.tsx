import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listCustomerPipeline, getCRMDashboardStats, listOpportunities } from "@/lib/crm.functions";
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
    const [pipeline, stats, opportunities] = await Promise.all([
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
    ]);
    return { pipeline, stats, opportunities };
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

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
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
        <StatCard title="Agendamentos Abandonados" value={stats.abandonedAppointments} description="Pararam no meio do agendamento" />
        <StatCard title="Clientes Quentes" value={stats.hotCustomers} description="Score acima de 70%" color="text-green-600" />
        <StatCard title="Clientes VIP" value={stats.vipCustomers} description="Score acima de 90%" color="text-purple-600" />
        <StatCard title="Clientes Frios" value={stats.coldCustomers} description="Score abaixo de 30%" color="text-red-600" />
        
        <StatCard title="Sem retorno (30 dias)" value={stats.noReturn30} description="Último contato há 1 mês" />
        <StatCard title="Sem retorno (60 dias)" value={stats.noReturn60} description="Último contato há 2 meses" />
        <StatCard title="Sem retorno (90 dias)" value={stats.noReturn90} description="Último contato há 3 meses" />
        <StatCard title="Clientes Plano Beauty" value={stats.beautyPlanCustomers} description="Assinantes ativos" color="text-pink-600" />

        <StatCard title="Follow-ups Pendentes" value={stats.pendingFollowups} description="Aguardando envio pelo cron" />
        <StatCard title="Follow-ups Enviados" value={stats.sentFollowups} description="Histórico total de envios" />
        <StatCard title="Taxa de Conversão" value={`${stats.conversionRate.toFixed(1)}%`} description="Lead -> Agendado/Convertido" color="text-blue-600" />
        <Card>
          <CardHeader className="p-4 pb-0">
            <CardTitle className="text-sm font-medium">Motivos de Perda</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-xs space-y-1">
              {Object.entries(stats.lossReasons).length > 0 ? (
                Object.entries(stats.lossReasons).map(([reason, count]) => (
                  <div key={reason} className="flex justify-between">
                    <span className="truncate mr-2">{reason.replace(/_/g, ' ')}</span>
                    <span className="font-bold">{String(count)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground italic">Nenhum dado registrado</p>
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
                  <Card key={opp.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <Badge variant="outline" className="mb-1">{opp.opportunity_type.replace(/_/g, ' ')}</Badge>
                          <CardTitle className="text-sm">{opp.customer_id}</CardTitle>
                        </div>
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                          Score: {opp.score}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <p className="text-xs text-muted-foreground italic">"{opp.trigger}"</p>
                      <div className="bg-blue-50/50 p-2 rounded text-[11px] border border-blue-100">
                        <strong>Ação Recomendada:</strong> {opp.recommended_action}
                      </div>
                      <div className="flex justify-end pt-2">
                        <Badge variant="secondary" className="text-[9px] uppercase">{opp.status}</Badge>
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
          <h2 className="text-xl font-semibold">Funil de Vendas (Pipeline)</h2>
          <ScrollArea className="h-[600px] rounded-md border p-4">
            <div className="grid gap-4">
              {customers.map((customer: any) => (
            <Card key={customer.phone} className="overflow-hidden">
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
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Score de Conversão</span>
                    <span>{customer.conversion_score || 0}%</span>
                  </div>
                  <Progress value={customer.conversion_score || 0} className="h-2" />
                  <div className={`h-1 w-full rounded-full ${getScoreColor(customer.conversion_score || 0)} opacity-20`} />
                </div>

                {customer.abandonment_reason && (
                  <div className="p-2 bg-muted/50 rounded text-[10px] text-muted-foreground">
                    <strong>Motivo do abandono:</strong> {customer.abandonment_reason}
                  </div>
                )}

                <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-2 border-t">
                  <span>Última interação</span>
                  <span>
                    {customer.last_interaction_at 
                      ? formatDistanceToNow(new Date(customer.last_interaction_at), { addSuffix: true, locale: ptBR })
                      : "Nunca"}
                  </span>
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
