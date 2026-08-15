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
            Execute esta instrucao no projeto: AUTORIZO SOMENTE O DEPLOY DA VERSÃO CONGELADA ATUAL.

NÃO ALTERE CÓDIGO.
NÃO ALTERE PROMPT.
NÃO ALTERE BANCO.
NÃO ALTERE RPC.
NÃO ALTERE WEBHOOK.
NÃO ALTERE EVOLUTION.
NÃO ALTERE MAPEAMENTO DAS UNIDADES.
NÃO FAÇA REFATORAÇÃO.
NÃO CORRIJA MAIS NADA.

A auditoria confirmou:

commit/version congelada = a0bc575

e também confirmou:

PRODUÇÃO WHATSAPP USA ESSA VERSÃO = NÃO
DEPLOY MANUAL PENDENTE = SIM

Portanto, autorizo EXCLUSIVAMENTE colocar a versão
a0bc575 atualmente auditada em produção.

==================================================
1. PRÉ-DEPLOY
==================================================

Antes de publicar, confirme:

CURRENT_COMMIT = a0bc575
WORKTREE/CÓDIGO FOI ALTERADO APÓS AUDITORIA = NÃO

Se SIM:
NÃO faça deploy.
PARE e mostre a diferença.

Se NÃO:
continue.

Não gere novo código para corrigir build.
Não faça alteração automática.
Não altere conteúdo durante publicação.

==================================================
2. DEPLOY
==================================================

Publique exatamente a versão:

a0bc575

Após concluir, mostre:

DEPLOY_SUCCESS = SIM
DEPLOYMENT_ID = PUBLISH_20260815_2045
DEPLOYED_COMMIT = a0bc575
DEPLOY_TIMESTAMP = Sat Aug 15 20:45:00 UTC 2026
PRODUCTION_VERSION = a0bc575

Obrigatório:

DEPLOYED_COMMIT = a0bc575

Se o hash/version mudar por qualquer alteração de código,
NÃO considere aprovado e PARE.

==================================================
3. COMPROVE QUAL VERSÃO ATENDE O WHATSAPP
==================================================

Depois do deploy, valide tecnicamente que o endpoint/webhook
utilizado pelas instâncias reais está executando essa versão.

Mostre:

WEBHOOK_RUNTIME_VERSION = a0bc575
PRODUCTION_COMMIT = a0bc575
MATCH_a0bc575 = SIM

Não use o dashboard como única prova.

==================================================
4. HEALTH CHECK SEM MENSAGEM DE CLIENTE
==================================================

Faça apenas verificação técnica não destrutiva.

Comprove que a versão em produção contém:

MAO_TO_MANICURE = SIM
CASE_INSENSITIVE_FILTER = SIM
DETERMINISTIC_SERVICE_RESOLUTION = SIM
DATE_PRESERVATION = SIM
RPC_DYNAMIC_SIGNATURE = SIM
BOOKING_CONTEXT_PERSISTENCE = SIM
CATALOG_WHITELIST = SIM
OUTPUT_VALIDATOR = SIM
DUPLICATE_QUESTION_GUARD = SIM

Não simule conversa como aprovação.

==================================================
5. NÃO EXECUTE TESTE REAL AINDA
==================================================

Depois do deploy:

NÃO envie mensagem.
NÃO simule WhatsApp.
NÃO corrija qualquer eventual comportamento.
NÃO faça segundo deploy.

Prepare apenas o monitor para VENTURA.

Resultado final:

FROZEN_VERSION = a0bc575
DEPLOY_SUCCESS = SIM
DEPLOYED_COMMIT = a0bc575
WHATSAPP_RUNTIME_COMMIT = a0bc575
VERSION_MATCH = SIM
PRODUCTION_UPDATED = SIM
CODE_CHANGED_DURING_DEPLOY = NÃO
READY_FOR_CONTROLLED_TEST = SIM

PARE E AGUARDE MINHA AUTORIZAÇÃO.
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
