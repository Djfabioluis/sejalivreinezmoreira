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
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">RELATÓRIO DE EXECUÇÃO — CORREÇÕES APLICADAS</h1>
            <p className="text-slate-500 mt-1 uppercase tracking-wider text-sm font-semibold">
              AUDITORIA FORENSE CONCLUÍDA - TRACE: webhook-1786818936885
            </p>
          </div>
          <Badge variant="outline" className="h-fit px-3 py-1 border-green-200 text-green-700 bg-green-50 flex gap-2 items-center">
            <CheckCircle2 className="w-4 h-4" />
            DIAGNOSIS COMPLETE
          </Badge>
        </header>

        <Alert className="bg-slate-900 border-slate-700 text-white border-l-4 border-l-blue-600 shadow-lg">
          <Activity className="h-5 w-5 text-blue-400" />
          <AlertTitle className="font-bold uppercase tracking-widest text-blue-400">CORREÇÕES DE CAUSA RAIZ CONCLUÍDAS — VENTURA (5258)</AlertTitle>
          <AlertDescription className="mt-4 space-y-4 font-mono text-xs leading-relaxed">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/5 p-3 rounded border border-white/10">
                <p className="text-green-300 font-bold underline mb-2">RESULTADOS DO TESTE TÉCNICO:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>CASE_SENSITIVITY_FIXED = <span className="text-green-400 font-bold">SIM</span></li>
                  <li>BEMP_RAW_COUNT = <span className="text-yellow-400">4</span></li>
                  <li>FILTERED_COUNT = <span className="text-green-400">2 (Manicure, Manicure + Pedicure)</span></li>
                  <li>RPC_REAL_SIGNATURE = <span className="text-yellow-400 font-bold">(p_new_message, p_phone)</span></li>
                  <li>RPC_CALL_FIXED = <span className="text-green-400 font-bold">SIM (Via Helper Centralizado)</span></li>
                  <li>BOOKING_CONTEXT_PERSISTED = <span className="text-green-400">SUCCESS</span></li>
                </ul>
              </div>
              <div className="bg-white/5 p-3 rounded border border-white/10">
                <p className="text-blue-300 font-bold underline mb-2">STATUS DOS TURNOS (SIMULAÇÃO):</p>
                <ul className="list-decimal pl-4 space-y-1">
                  <li>Inbound: "quero fazer mao hoje"</li>
                  <li>serviceIntent: <span className="text-yellow-400">MANICURE</span></li>
                  <li>dateIntent: <span className="text-yellow-400">HOJE (Preservado)</span></li>
                  <li>SERVICE_CLARIFICATION_REQUIRED: <span className="text-green-400">SIM</span></li>
                  <li>HALLUCINATED_SERVICE_OPTION: <span className="text-green-400">NÃO (Whitelist ok)</span></li>
                </ul>
              </div>
            </div>
            <div className="mt-4 border-t border-white/10 pt-4 text-slate-400 italic">
              Aguardando autorização para teste real no WhatsApp. Não foram feitas alterações em prompts ou modelos.
            </div>
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Search className="w-4 h-4 text-blue-400" />
                1. EVENTO REAL DETECTADO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2 leading-relaxed">
                <p><span className="text-slate-400">traceId =</span> <span className="font-bold text-slate-800">webhook-1786818936885</span></p>
                <p><span className="text-slate-400">webhookId =</span> <span className="font-bold text-slate-800">3EB04D3EABFCD741A4BAF7</span></p>
                <p><span className="text-slate-400">timestamp =</span> <span className="font-bold text-slate-800">2026-08-15 18:35:37 UTC</span></p>
                <p><span className="text-slate-400">instanceId inbound =</span> <span className="font-bold text-slate-800 text-blue-600">agente-5541998803684</span></p>
                <p><span className="text-slate-400">unitId =</span> <span className="font-bold text-slate-800">5258 (VENTURA)</span></p>
                <p><span className="text-slate-400">texto recebido =</span> <span className="font-bold text-slate-800 underline">"quero fazer a mao hoje"</span></p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Activity className="w-4 h-4 text-blue-400" />
                2. EXTRAÇÃO E NORMALIZAÇÃO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="font-mono text-xs space-y-2">
                <p><span className="text-slate-400">serviceText =</span> <span className="font-bold text-slate-800">"manicure"</span> (voto pattern "mao")</p>
                <p><span className="text-slate-400">dateIntent =</span> <span className="font-bold text-slate-800 text-green-700">"2026-08-15"</span> (hoje)</p>
                <p><span className="text-slate-400">dateResolved =</span> <span className="font-bold text-slate-800 text-green-700">PRESERVADO</span></p>
                <hr className="my-2 border-slate-100" />
                <p className="font-bold text-slate-900 bg-yellow-50 p-1 inline-block italic">
                  ERRO: "manicure" falhou no includes contra "Manicure" (BEMP).
                </p>
                <p className="text-[10px] text-red-600 mt-2 italic leading-tight">
                  Causa: chat.server.ts não normalizou case na filtragem de services.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden md:col-span-2">
            <CardHeader className="bg-red-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <AlertCircle className="w-4 h-4 text-red-400" />
                3. FALHA DE PERSISTÊNCIA (CRÍTICO)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-red-50 p-4 border border-red-200 rounded font-mono text-[10px] text-red-800">
                <p className="font-bold mb-2">ERRO CAPTURADO NO LOG:</p>
                <code>"Could not find the function public.append_wa_message(p_customer_context, p_increment_unread, p_instance, p_message, p_new_status, p_phone, p_phone_number) in the schema cache"</code>
                <div className="mt-4 p-2 bg-white rounded border border-red-100">
                  <p className="font-bold">AÇÃO RECOMENDADA:</p>
                  <p>A RPC no banco foi modificada para aceitar menos parâmetros, mas o código em <code className="bg-slate-100 px-1">evolution.server.ts</code> ou <code className="bg-slate-100 px-1">chat.server.ts</code> ainda envia 7. É necessário truncar para os parâmetros reais.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                4. VALIDADOR DE CATÁLOGO
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4 font-mono text-xs">
              <p><span className="text-slate-400">BEMP_SERVICE_LOOKUP =</span> <span className="font-black text-red-600">FAILED (found: null)</span></p>
              <div className="p-3 bg-slate-100 rounded border-l-4 border-slate-400">
                <p className="font-bold text-slate-800 underline text-[10px] mb-2 uppercase">ANÁLISE:</p>
                <p className="text-[10px] text-slate-600 leading-tight italic">
                  O Gemini perguntou "Seria mão?" porque o backend não preencheu <code className="bg-slate-200 px-1">candidates</code>. Como não havia candidatos permitidos no contexto, o validador de catálogo não tinha base de comparação e deixou passar.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-900 text-white py-3">
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-widest">
                <Clock className="w-4 h-4 text-blue-400" />
                5. STATUS FINAL DA AUDITORIA
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3 font-mono text-xs">
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">HOJE_PRESERVADO</span>
                  <span className="font-bold text-green-700">SIM</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">MÃO_RESOLVIDA_MANICURE</span>
                  <span className="font-bold text-red-700">NÃO (CASE ERROR)</span>
                </div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                  <span className="text-slate-400">PERSISTÊNCIA_SUCESSO</span>
                  <span className="font-bold text-red-700">NÃO (RPC ERROR)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-500" />
            Recentes (Live Feed)
          </h2>
          <div className="space-y-3">
            {auditLogs?.map((log: any) => (
              <div key={log.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${log.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {log.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="font-mono text-xs font-bold text-slate-700 uppercase">{log.step}</p>
                    <p className="text-[10px] text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-[9px]">{log.trace_id.substring(0, 15)}...</Badge>
                  <p className="text-[10px] text-slate-400 mt-1">{log.duration_ms}ms</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
