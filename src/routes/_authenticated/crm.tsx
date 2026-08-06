import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listCustomerPipeline } from "@/lib/crm.functions";
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
  loader: ({ context }) => context.queryClient.ensureQueryData({
    queryKey: ["crm-pipeline"],
    queryFn: () => listCustomerPipeline(),
  }),
  component: CRMPage,
});

function CRMPage() {
  const { data: customers } = useSuspenseQuery({
    queryKey: ["crm-pipeline"],
    queryFn: () => listCustomerPipeline(),
  });

  const getScoreColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">CRM Inteligente</h1>
        <Badge variant="outline" className="px-3 py-1">
          {customers.length} Clientes no Funil
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
      
      {customers.length === 0 && (
        <div className="text-center py-20 opacity-50">
          <p>Nenhum cliente no pipeline no momento.</p>
        </div>
      )}
    </div>
  );
}
