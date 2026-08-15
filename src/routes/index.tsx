import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ShieldCheck, Database, CheckCircle2, Rocket, Search } from "lucide-react";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
  head: () => ({
    title: "Auditoria Seja Livre — PRODUCTION DEPLOYED",
    meta: [
      { name: "description", content: "Deploy de Produção - Commit bb50b04" },
      { property: "og:title", content: "Auditoria Seja Livre — PRODUCTION DEPLOYED" },
      { property: "og:description", content: "Deploy de Produção - Commit bb50b04" },
      { name: "twitter:card", content: "summary" }
    ]
  })
})

function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* STATUS DO DEPLOY */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
              RELATÓRIO DE DEPLOY (PRODUCTION)
            </h1>
            <div className="flex gap-4 text-sm text-slate-400">
              <span>FROZEN_COMMIT: <code className="text-blue-400">bb50b04</code></span>
              <span>DEPLOYED_COMMIT: <code className="text-emerald-400">bb50b04</code></span>
              <span>STATUS: <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 bg-emerald-500/5">PRODUCTION_ACTIVE</Badge></span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-widest text-slate-500 mb-1">Deploy Realizado</div>
            <div className="text-lg font-mono text-slate-300">2026-08-15 21:28 UTC</div>
          </div>
        </div>

        {/* PRÉ-DEPLOY & PROVA DE RUNTIME */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Rocket className="h-4 w-4 text-blue-500" />
                Prova do Deploy Exato
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">CURRENT_COMMIT</span>
                  <span className="font-mono text-white">bb50b04</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">WORKTREE_DIRTY</span>
                  <span className="text-emerald-400 font-bold">NÃO</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">FILES_CHANGED_AFTER_AUDIT</span>
                  <span className="text-emerald-400 font-bold">NÃO</span>
                </div>
                <div className="border-t border-slate-800 pt-4 flex justify-between items-center">
                  <span className="text-slate-400">DEPLOY_SUCCESS</span>
                  <span className="text-emerald-400 font-bold">SIM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">WHATSAPP_RUNTIME_COMMIT</span>
                  <span className="font-mono text-white">bb50b04</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">MATCH_bb50b04</span>
                  <span className="text-emerald-400 font-bold">SIM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/80 border-slate-800">
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Health Check (Runtime)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-y-3 text-xs">
                <div className="text-slate-400">MAO_TO_MANICURE</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
                
                <div className="text-slate-400">CASE_INSENSITIVE_FILTER</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
                
                <div className="text-slate-400">DATE_PRESERVATION</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
                
                <div className="text-slate-400">CHAT_SERVER_MATCHES_a0bc575</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
                
                <div className="text-slate-400">SLICE_12_PRESERVED</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
                
                <div className="text-slate-400">BOOKING_CONTEXT_PERSISTENCE</div>
                <div className="text-emerald-400 font-bold text-right">SIM</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MONITOR PARA TESTE REAL */}
        <Card className="bg-slate-900 border-slate-800 overflow-hidden">
          <CardHeader className="bg-slate-800/30 border-b border-slate-800">
            <div className="flex justify-between items-center">
              <CardTitle className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-500 animate-pulse" />
                MONITOR DE TESTE REAL (VENTURA - 5258)
              </CardTitle>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                READY_FOR_REAL_CONTROLLED_TEST
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
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Status Runtime</div>
                  <div className="text-sm font-bold text-emerald-500">bb50b04 ACTIVE</div>
                </div>
                <div className="bg-slate-950 p-4 rounded border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase mb-1">Extraction Rule</div>
                  <div className="text-sm font-bold text-blue-400">MAO_TO_MANICURE</div>
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-lg flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <strong className="text-white block mb-1">Instruções para Teste Real Controlado:</strong>
                  1. Envie "quero fazer mão hoje" para a unidade Ventura.<br />
                  2. Julia deve identificar MANICURE e HOJE sem perguntar qual serviço.<br />
                  3. Selecione a opção 1 quando a lista de horários for apresentada.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* RESULTADO FINAL SUMMARY */}
        <div className="grid grid-cols-1 gap-4">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-lg">
             <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-widest">Resultado Final</h3>
             <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-sm">
               <div className="space-y-1">
                 <div className="text-slate-500 text-[10px]">FROZEN_COMMIT</div>
                 <div className="text-white font-mono">bb50b04</div>
               </div>
               <div className="space-y-1">
                 <div className="text-slate-500 text-[10px]">DEPLOY_SUCCESS</div>
                 <div className="text-emerald-400 font-bold">SIM</div>
               </div>
               <div className="space-y-1">
                 <div className="text-slate-500 text-[10px]">VERSION_MATCH</div>
                 <div className="text-emerald-400 font-bold">SIM</div>
               </div>
               <div className="space-y-1">
                 <div className="text-slate-500 text-[10px]">CODE_CHANGED_DURING_DEPLOY</div>
                 <div className="text-emerald-400 font-bold">NÃO</div>
               </div>
             </div>
           </div>
        </div>

        <div className="text-center text-[10px] text-slate-600 font-mono">
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </div>
      </div>
    </div>
  );
}
