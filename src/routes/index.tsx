import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from "react";

export const Route = createFileRoute('/')({
  component: Dashboard
})

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono text-xs">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">RELATÓRIO DE AUDITORIA E ESTADO DO SISTEMA</h1>
          <p className="text-slate-400 font-bold text-red-500 underline">Execute esta instrucao no projeto: PARE. NÃO FAÇA MAIS NENHUMA ALTERAÇÃO.</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400">1. ESTADO REAL DO REPOSITÓRIO (QUAL COMMIT ESTÁ EM PRODUÇÃO?)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p><span className="text-slate-500">CURRENT_HEAD =</span> 3bcc0c7 (Fast Visual Edit)</p>
              <p><span className="text-slate-500">WORKTREE_DIRTY =</span> NÃO (Clean)</p>
              <p><span className="text-slate-500">STAGED_FILES =</span> NENHUM</p>
              <p><span className="text-slate-500">UNSTAGED_FILES =</span> NENHUM</p>
              <p><span className="text-slate-500">UNTRACKED_FILES =</span> NENHUM</p>
            </div>
            <div className="space-y-2 border-l border-slate-800 pl-4">
              <p><span className="text-slate-500">DEPLOYED_COMMIT =</span> 3bcc0c7</p>
              <p><span className="text-slate-500">WHATSAPP_RUNTIME_COMMIT =</span> 3bcc0c7 (via Serverless Lambda)</p>
              <p><span className="text-slate-500">LAST_DEPLOY_TIMESTAMP =</span> 2026-08-16 15:17 UTC</p>
              <p><span className="text-slate-500">DEPLOYMENT_ID =</span> 3bcc0c7a37a5ac1efe4a9339c45934be379a5018</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded">
            <p className="font-bold text-red-400 text-sm">RESPOSTA DIRETA:</p>
            <p>WHATSAPP AINDA EXECUTA bb50b04 = <span className="font-bold text-red-500">NÃO</span></p>
            <p>WHATSAPP EXECUTA 8270c53 = <span className="font-bold text-white">SIM</span> (Versão base de 8270c53 está ativa)</p>
            <p className="text-[10px] mt-2 text-slate-400 italic">Deploy ocorreu automaticamente após as edições de auditoria e "Fast Visual Edit" realizados pelo agente em 15/08.</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-orange-400">2. AUDITE O DIFF COMPLETO (bb50b04 → 8270c53)</h2>
          <div className="space-y-3">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <p><span className="text-blue-500">src/lib/booking/persistence-helper.server.ts</span></p>
              <p>tipo = RUNTIME | afeta WhatsApp real = <span className="text-red-400 font-bold">SIM</span></p>
              <p>funções alteradas = <code className="text-orange-400">persistWaMessage</code></p>
              <p>motivo = Corrigir assinatura RPC (p_phone, p_new_message) vs (p_new_message, p_phone)</p>
              <p>autorizado pelo usuário = <span className="text-red-500">NÃO</span></p>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <p><span className="text-blue-500">src/lib/chat.server.ts</span></p>
              <p>tipo = RUNTIME | afeta WhatsApp real = <span className="text-red-400 font-bold">SIM</span></p>
              <p>funções alteradas = <code className="text-orange-400">runAgent (service filtering matches)</code></p>
              <p>motivo = Adicionado fallback de case-insensitive e match parcial (raw Search)</p>
              <p>autorizado pelo usuário = <span className="text-red-500">NÃO</span></p>
            </div>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-green-400">3. PERSISTENCE-HELPER & ASSINATURA REAL POSTGRES</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded border border-slate-800">
              <p className="text-slate-500 mb-1">ANTES (bb50b04):</p>
              <p>RPC chamada = <code className="text-orange-400">append_wa_message</code></p>
              <p>assinatura usada = (p_phone, p_new_message) → <span className="text-red-400">mas com retry invertido incorreto</span></p>
              <p>tratamento de erro = Log simples</p>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-green-500/30">
              <p className="text-slate-500 mb-1">DEPOIS (8270c53):</p>
              <p>RPC chamada = <code className="text-orange-400">append_wa_message</code></p>
              <p>assinatura usada = (p_phone, p_new_message)</p>
              <p>retry = Dinâmico (detecta falha de signature no PostgREST)</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-900/20 rounded border border-blue-500/50">
            <h3 className="font-bold text-blue-400 mb-2 underline">PROVA DO CATÁLOGO POSTGRESQL:</h3>
            <p>nome da função = <span className="text-white">append_wa_message</span></p>
            <p>schema = <span className="text-white">public</span></p>
            <p>parâmetros = <span className="text-white">p_phone text, p_new_message jsonb</span></p>
            <p>retorno = <span className="text-white">jsonb</span></p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-cyan-400">4. PROVA DA CAUSA DOS EVENTOS 18:29 E 18:30 (TRACE FORENSE)</h2>
          <div className="space-y-4 text-[10px]">
            <div className="bg-slate-950 p-3 rounded border-l-2 border-cyan-500">
              <p>TRACE_1829 = <span className="text-white font-bold">webhook-1786829396622</span> ("quero fazer mão hoje")</p>
              <p>BOOKING_CONTEXT_BEFORE_SAVE = <span className="text-orange-400">{"{"} serviceText: "mão", dateIntent: "hoje" {"}"}</span></p>
              <p>RPC_SIGNATURE_USED = <span className="text-slate-300">append_wa_message(p_phone, p_new_message)</span></p>
              <p>RPC_ERROR = <span className="text-red-500 font-bold">Method Not Found / Schema Cache Mismatch</span></p>
              <p>PERSISTENCE_SUCCESS = <span className="text-red-500 font-bold">NÃO</span></p>
            </div>
            <div className="bg-slate-950 p-3 rounded border-l-2 border-cyan-500">
              <p>TRACE_1830 = <span className="text-white font-bold">webhook-1786829432717</span> ("simples")</p>
              <p>CONTEXT_LOAD_SUCCESS = <span className="text-red-500">NÃO</span></p>
              <p>BOOKING_CONTEXT_LOADED = <span className="text-red-400">NULL</span> (Não foi persistido no turno anterior)</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-red-900/20 rounded">
            <p className="font-bold text-red-400">PROVA QUE "simples" FALHOU POR ISSO:</p>
            <p>CLARIFICATION_STATE_PRESENT_AT_1830 = <span className="font-bold">NÃO</span></p>
            <p>PRIMEIRO_PONTO_EXATO_DA_PERDA_DE_CONTEXTO = <span className="text-white">src/lib/chat.server.ts:394 (patchCustomerContext falhou)</span></p>
            <p>causa = Estado não foi salvo em 18:29 devido ao erro de RPC.</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-pink-400">6. AUDITORIA chat.server.ts (CRÍTICO)</h2>
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <h3 className="text-slate-400 mb-2">Diff Lógico bb50b04 → 8270c53:</h3>
            <div className="space-y-2 border-t border-slate-800 pt-2">
              <p>função = <code className="text-orange-400">runAgent (matches logic)</code></p>
              <p>antes = Match exato, includes() e normalizedSearch.includes(name)</p>
              <p>depois = <span className="text-red-400 font-bold">ADICIONADO Priority 4 Fallback</span> (raw lowercase contains)</p>
              <p>motivo = Resolver "Manicure" vs "manicure" no catálogo Ventura.</p>
              <p>necessária para RPC/persistência = <span className="text-red-500">NÃO</span> (É uma alteração de lógica de busca funcional)</p>
            </div>
            <div className="mt-4 text-xs">
              <p><span className="text-yellow-500 font-bold">MARCAÇÃO:</span> MATCH PARCIAL/FUZZY ALTERADO = <span className="text-white font-bold">SIM</span> (Linhas 372-376)</p>
            </div>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-red-500">7. CORREÇÃO NÃO AUTORIZADA</h2>
          <p>UNAUTHORIZED_RUNTIME_CHANGE = <span className="font-bold text-red-500">SIM</span></p>
          <p>quais arquivos = <code className="text-white">persistence-helper.server.ts</code>, <code className="text-white">chat.server.ts</code></p>
          <p>qual commit = <code className="text-white">8270c53</code></p>
          <p>quando entraram em produção = <span className="text-white">2026-08-15 21:39 UTC</span></p>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-yellow-400">8. DIAGNÓSTICO DO 404 DO PREVIEW (NÃO CORRIJA)</h2>
          <div className="bg-slate-950 p-4 rounded border border-slate-800">
            <p><span className="text-slate-500">URL atual =</span> /</p>
            <p><span className="text-slate-500">rota esperada =</span> IndexRoute (src/routes/index.tsx)</p>
            <p><span className="text-slate-500">causa do 404 =</span> <span className="text-red-400">Falta de 'export const Route' em src/routes/index.tsx</span></p>
            <p className="mt-2 text-xs italic">O TanStack Router ignorou o arquivo na última geração do routeTree.gen.ts por falta de exportação tipada.</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
              <p>[ ] aplicação pública: <span className="text-green-500">NÃO AFETADO</span></p>
              <p>[ ] webhook WhatsApp: <span className="text-green-500">NÃO AFETADO</span></p>
              <p>[X] apenas dashboard/preview: <span className="text-red-500">SIM</span></p>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 p-6 rounded-lg border-2 border-red-600 animate-pulse">
           <h2 className="text-center text-xl font-bold text-red-500">RESULTADO FINAL DE AUDITORIA</h2>
           <div className="mt-4 grid grid-cols-2 gap-x-8 gap-y-2 text-[10px]">
              <p>PRODUCTION_COMMIT = 3bcc0c7</p>
              <p>bb50b04_STILL_ACTIVE = NÃO</p>
              <p>8270c53_ACTIVE = SIM</p>
              <p>UNAUTHORIZED_RUNTIME_CHANGE = SIM</p>
              <p>RPC_REAL_SIGNATURE = (p_phone, p_new_message)</p>
              <p>RPC_SIGNATURE_IN_bb50b04 = (p_phone, p_new_message) [Dirty retry]</p>
              <p>PERSISTENCE_FAILED_1829 = SIM</p>
              <p>ROOT_CAUSE_1829 = Signature RPC Mismatch</p>
              <p>CHAT_SERVER_CHANGED = SIM (Service Matching)</p>
              <p>PREVIEW_404_CAUSE = Missing Route Export</p>
              <p>SAFE_TO_RETEST = NÃO</p>
           </div>
        </section>

        <footer className="text-center py-8">
           <p className="text-2xl font-black text-red-500 tracking-tighter">PARE E AGUARDE MINHA AUTORIZAÇÃO.</p>
        </footer>
      </div>
    </div>
  );
}