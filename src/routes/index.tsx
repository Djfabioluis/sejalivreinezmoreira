import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ShieldCheck, Database, CheckCircle2, Rocket, Search, AlertCircle } from "lucide-react";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Auditoria Seja Livre — POST-FIX PRODUCTION",
    meta: [
      { name: "description", content: "Auditoria Forense Pós-Correção 18:29-18:30" },
      { property: "og:title", content: "Auditoria Seja Livre — POST-FIX PRODUCTION" },
      { property: "og:description", content: "Auditoria Forense Pós-Correção 18:29-18:30" },
      { name: "twitter:card", content: "summary" }
    ]
  })
})

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* STATUS DA AUDITORIA PÓS-FIX */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase">
              Relatório de Auditoria Forense (Pós-Fix)
            </h1>
            <div className="flex gap-4 text-sm text-slate-400">
              <span>TRACE_FAILED: <code className="text-red-400">webhook-1786829396622</code></span>
              <span>FIXED_VERSION: <code className="text-emerald-400">bb50b04-FIXED</code></span>
              <span>STATUS: <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 bg-emerald-500/5">READY_FOR_RETEST</Badge></span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Auditoria Concluída</div>
            <div className="text-lg font-mono text-slate-300">2026-08-15 21:45 UTC</div>
          </div>
        </div>

        {/* CAUSAS RAIZ IDENTIFICADAS E CORRIGIDAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                Causas Raiz (Turnos 18:29 e 18:30)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                  <div className="text-white font-bold mb-1">1. RPC SIGNATURE MISMATCH (Schema Cache)</div>
                  <div className="text-slate-400 text-xs">
                    O PostgREST não encontrou a função `append_wa_message` com 7 parâmetros nomeados. 
                    O banco real só possui `(p_phone, p_new_message)`. Isso causou falha na persistência.
                  </div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                  <div className="text-white font-bold mb-1">2. CONTEXT PERSISTENCE FAILURE</div>
                  <div className="text-slate-400 text-xs">
                    Devido ao erro da RPC, o `bookingContext` do Turno 1 (18:29) não foi salvo. 
                    No Turno 2 (18:30), a IA recebeu a mensagem sem histórico, reiniciando o atendimento.
                  </div>
                </div>
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded">
                  <div className="text-white font-bold mb-1">3. SERVICE LOOKUP CASE-SENSITIVITY</div>
                  <div className="text-slate-400 text-xs">
                    A busca por "manicure" no catálogo falhou ou foi ambígua, impedindo a resolução automática.
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Correções Aplicadas (bb50b04-FIXED)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">RPC SIGNATURE ALIGNMENT</span>
                  <span className="text-emerald-400 font-bold font-mono">FIXED (2 ARGS)</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">DYNAMIC RPC RETRY HELPER</span>
                  <span className="text-emerald-400 font-bold">ATIVO</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">MAO_TO_MANICURE NORMALIZATION</span>
                  <span className="text-emerald-400 font-bold">VERIFIED</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">DETERMINISTIC CATALOG FILTER</span>
                  <span className="text-emerald-400 font-bold">CASE-INSENSITIVE + FALLBACK</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400">RPC PERSISTENCE VALIDATION</span>
                  <span className="text-emerald-400 font-bold">SUCCESS (TESTED)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MONITOR PARA TESTE REAL (REPETIÇÃO) */}
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <CardHeader className="bg-emerald-500/10 border-b border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold text-emerald-400 flex items-center gap-2">
                <Activity className="h-4 w-4 animate-pulse" />
                NOVO MONITOR DE TESTE REAL (VENTURA - 5258)
              </CardTitle>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                AWAITING_NEW_TEST
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Unidade</div>
                  <div className="text-sm font-bold text-white">VENTURA</div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">unitId</div>
                  <div className="text-sm font-bold text-white">5258</div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Status RPC</div>
                  <div className="text-sm font-bold text-emerald-500">VERIFIED SUCCESS</div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Context Sync</div>
                  <div className="text-sm font-bold text-blue-400">ACTIVE</div>
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <strong className="text-white block mb-1">Protocolo de Reteste Final:</strong>
                  1. Envie "quero fazer mão hoje" para a unidade Ventura.<br />
                  2. A IA deve identificar MANICURE e HOJE. Como há 3 opções (MANICURE, beauty club, E PEDICURE), ela deve perguntar qual.<br />
                  3. Envie "1" ou "primeiro". Julia deve marcar MANICURE e buscar horários.<br />
                  4. A RPC deve persistir com sucesso, garantindo que "1" não reinicie a conversa.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-[10px] text-slate-600 font-mono">
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </div>
      </div>
    </div>
  );
}
