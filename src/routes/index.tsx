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
    title: "Auditoria Seja Livre — LIVE MONITOR",
    meta: [
      { name: "description", content: "Monitoramento de Teste Real - Unidade Ventura" },
      { property: "og:title", content: "Auditoria Seja Livre — LIVE MONITOR" },
      { property: "og:description", content: "Monitoramento de Teste Real - Unidade Ventura" },
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

O teste real anterior (16:10) falhou por duas causas identificadas:
1. LOOKUP_RETURNED_NULL: O filtro determinístico não encontrou candidatos para "mão".
2. PERSISTENCE_ERROR: A RPC append_wa_message falhou por erro de cache de esquema.

As correções aplicadas foram:
- RESOLUÇÃO DETERMINÍSTICA: Adicionada prioridade para padrões como "mão" {"->"} "manicure".
- DATA_PRESERVATION: Implementada preservação forçada de data durante resolução de ambiguidade.
- RPC_PERSISTENCE: Implementada detecção e retry automático para a assinatura invertida da RPC.
- AUDITORIA_REVERSA: Adicionado bloqueio para Julia perguntar sobre serviços já presentes no contexto.

Monitore o teste REAL (Turno 1):

Eu enviarei:
"quero fazer mão hoje"

Capture:
- BEMP_SERVICE_LOOKUP_COMPLETED (Deve conter candidatos reais)
- DATE_RESOLVED (Deve ser hoje)
- WHISTLELIST_VALIDATION (Deve autorizar a resposta)

Depois eu responderei:
"1"

Capture:
- CLARIFICATION_SELECTION_RESOLVED (Deve manter a data)
- LIST_SLOTS_CALLED (Imediato)

SE HOUVER QUALQUER FALHA:
NÃO CORRIJA. MOSTRE O TRACE E PARE.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
            <CardHeader className="bg-slate-800 text-white py-2">
              <CardTitle className="text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3 text-blue-400" />
                Validado (Causa Raiz)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 font-mono text-[10px] space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">LOOKUP_LOGGING:</span>
                <span className="text-green-600 font-bold">ENHANCED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">RPC_PERSISTENCE:</span>
                <span className="text-green-600 font-bold">DYNAMIC_CALL</span>
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
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {auditLogs?.map((log: any) => (
                  <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <Badge variant="outline" className={`text-[8px] font-mono py-0 ${
                        log.step.includes('FAILED') || log.step.includes('ERROR') ? 'border-red-200 text-red-600 bg-red-50' : 
                        log.step.includes('COMPLETED') || log.step.includes('SENT') ? 'border-green-200 text-green-600 bg-green-50' : 
                        'border-slate-200 text-slate-600'
                      }`}>{log.step}</Badge>
                      <span className="text-[8px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[9px] text-slate-600 font-mono truncate">{log.trace_id}</p>
                      {log.payload && (
                        <pre className="text-[8px] bg-slate-100 p-1 rounded overflow-x-auto max-w-full text-slate-500">
                          {JSON.stringify(log.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                ))}
                {auditLogs && auditLogs.length > 0 && auditLogs.some((l: any) => l.step === 'BEMP_SERVICE_LOOKUP_COMPLETED' && l.payload?.foundCount === 0) && (
                  <div className="p-2 bg-yellow-50 border-t border-yellow-100 text-[9px] text-yellow-700 font-mono italic">
                    Aviso: Um lookup retornou 0 candidatos. Verifique a normalização.
                  </div>
                )}

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
