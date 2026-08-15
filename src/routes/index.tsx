import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Activity, Database, ShieldCheck, Search, Fingerprint, Clock, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Auditoria Seja Livre — FORENSIC REPORT",
    meta: [
      { name: "description", content: "Relatório de Auditoria Forense - Teste Ventura" },
      { property: "og:title", content: "Auditoria Seja Livre — FORENSIC REPORT" },
      { property: "og:description", content: "Relatório de Auditoria Forense - Teste Ventura" },
      { name: "twitter:card", content: "summary" }
    ]
  })
});

function Dashboard() {
  const { data: auditLogs } = useQuery({
    queryKey: ['audit-logs-forensic'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evo_trace_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 space-y-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-200">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">Monitoramento de Teste Real — VENTURA</h1>
            <p className="text-slate-500 mt-1 uppercase tracking-wider text-sm font-semibold">
              Unidade: VENTURA (5258) | Status: AGUARDANDO MENSAGEM
            </p>
          </div>
          <Badge variant="outline" className="h-fit px-3 py-1 border-blue-200 text-blue-700 bg-blue-50 flex gap-2 items-center">
            <Activity className="w-4 h-4 animate-pulse" />
            READY FOR LIVE TEST
          </Badge>
        </header>

        <Alert className="bg-slate-900 border-slate-700 text-white border-l-4 border-l-blue-600 shadow-lg">
          <Fingerprint className="h-5 w-5 text-blue-400" />
          <AlertTitle className="font-bold uppercase tracking-widest text-blue-400 text-xs">Instrução de Execução</AlertTitle>
          <AlertDescription className="mt-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-300">
            Execute esta instrucao no projeto: AUTORIZO SOMENTE O TESTE REAL NO WHATSAPP DA VENTURA.

NÃO FAÇA NOVAS ALTERAÇÕES.

O teste técnico atual confirmou:

CASE_SENSITIVITY_FIXED = SIM
BEMP_RAW_COUNT = 4
FILTERED_COUNT = 2

Candidatos compatíveis:
- Manicure
- Manicure + Pedicure

RPC_CALL_FIXED = SIM
BOOKING_CONTEXT_PERSISTED = SUCCESS
SERVICE_INTENT = MANICURE
DATE_INTENT = HOJE
SERVICE_CLARIFICATION_REQUIRED = SIM
HALLUCINATED_SERVICE_OPTION = NÃO

Agora monitore o teste REAL.

Eu enviarei:

"quero fazer mão hoje"

No primeiro turno capture:

traceId =
instanceId =
unitId =
serviceIntent =
dateIntent =
LIST_SERVICES_CALLED =
BEMP_RAW_COUNT =
FILTERED_CANDIDATES =
allowedServices =
resposta enviada ao WhatsApp =

A resposta deve conter SOMENTE os candidatos reais permitidos.

Depois eu responderei:

"1"

Nesse segundo turno capture:

CLARIFICATION_SELECTION_RESOLVED =
serviceId selecionado =
serviceName selecionado =
dateIntent preservado =
bookingContext recuperado =
LIST_SERVICES_CALLED_AGAIN =
LIST_SLOTS_CALLED =
unitId enviado ao list_slots =
serviceId enviado =
data enviada =
BEMP_SLOTS_RETURNED =
horários enviados ao WhatsApp =

CRITÉRIOS:

- "mão" = MANICURE
- "hoje" permanece salvo
- somente Manicure e Manicure + Pedicure podem ser oferecidos,
  se forem exatamente os dois candidatos retornados neste teste real
- nenhuma opção inventada
- resposta "1" resolve o serviceId do primeiro candidato
- NÃO perguntar novamente serviço
- NÃO perguntar novamente data
- chamar list_slots imediatamente
- list_slots deve usar a unidade Ventura
- horários exibidos devem existir no retorno real da BEMP

SE HOUVER QUALQUER FALHA:
NÃO CORRIJA.
MOSTRE O TRACE E PARE.

NÃO ALTERE CÓDIGO.
NÃO ALTERE PROMPT.
NÃO ALTERE BANCO.
NÃO FAÇA NOVO DEPLOY.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-800 text-white py-2">
              <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3 text-blue-400" />
                Validado (Técnico)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 font-mono text-[10px] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">CASE_SENSITIVE:</span>
                <span className="text-green-600 font-bold">FIXED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RPC_INTERFACE:</span>
                <span className="text-green-600 font-bold">FIXED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">WHITELIST:</span>
                <span className="text-green-600 font-bold">ACTIVE</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white col-span-2">
            <CardHeader className="bg-blue-900 text-white py-2">
              <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Activity className="w-3 h-3 text-blue-300" />
                Live Trace Monitor (Ventura)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                {auditLogs?.slice(0, 5).map((log: any) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline" className="text-[8px] font-mono py-0">{log.step}</Badge>
                      <span className="text-[8px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-[9px] text-slate-600 truncate font-mono">{log.trace_id}</p>
                  </div>
                ))}
                {!auditLogs?.length && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    Aguardando tráfego real na instância Ventura...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
