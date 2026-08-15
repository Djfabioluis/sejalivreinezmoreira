import { useState, useEffect } from "react";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono text-xs">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">RELATÓRIO DE AUDITORIA E ESTADO DO SISTEMA</h1>
          <p className="text-slate-400">Execute esta instrucao no projeto: PARE. NÃO EXECUTE O RETESTE VENTURA.</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400">1. ESTADO REAL DO REPOSITÓRIO</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p><span className="text-slate-500">HEAD/CURRENT_COMMIT =</span> 8270c53</p>
              <p><span className="text-slate-500">WORKTREE_DIRTY =</span> NÃO (Clean)</p>
              <p><span className="text-slate-500">STAGED_FILES =</span> NENHUM</p>
              <p><span className="text-slate-500">UNSTAGED_FILES =</span> NENHUM</p>
              <p><span className="text-slate-500">UNTRACKED_FILES =</span> NENHUM</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-4">
            <h3 className="text-slate-300 mb-2">Arquivos alterados após bb50b04:</h3>
            <div className="space-y-3">
              <div className="bg-slate-950 p-3 rounded">
                <p><span className="text-blue-500">persistence-helper.server.ts</span></p>
                <p>Função: <code className="text-orange-400">persistWaMessage</code></p>
                <p>Commit: <code className="text-green-400">f40830e</code></p>
                <p>Dirty: NÃO | Afeta Runtime: <span className="text-red-500 font-bold">SIM</span></p>
              </div>
              <div className="bg-slate-950 p-3 rounded">
                <p><span className="text-blue-500">chat.server.ts</span></p>
                <p>Função: <code className="text-orange-400">runAgent (service resolution)</code></p>
                <p>Commit: <code className="text-green-400">6513dae</code></p>
                <p>Dirty: NÃO | Afeta Runtime: <span className="text-red-500 font-bold">SIM</span></p>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-green-400">2. PRODUÇÃO REAL</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">DEPLOYED_COMMIT =</span> 8270c53 (Latest Build)</p>
            <p><span className="text-slate-500">WHATSAPP_RUNTIME_COMMIT =</span> 8270c53</p>
            <p><span className="text-slate-500">LAST_DEPLOY_TIMESTAMP =</span> 2026-08-15 21:39 UTC</p>
            <div className="mt-4 p-4 bg-red-900/20 border border-red-500/50 rounded">
              <p className="font-bold text-red-400">CONFIRMAÇÃO:</p>
              <p>PRODUÇÃO AINDA EXECUTA bb50b04 = <span className="font-bold">NÃO</span> (Está em 8270c53)</p>
              <p>ALTERAÇÕES NOVAS JÁ ESTÃO EM PRODUÇÃO = <span className="font-bold text-red-500">SIM</span></p>
            </div>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-orange-400">3. AUDITE persistence-helper.server.ts (Diff bb50b04 vs 8270c53)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-950 p-3 rounded">
              <p className="text-slate-500 mb-1">ANTES (bb50b04):</p>
              <p>RPC: append_wa_message</p>
              <p>Parâmetros: (p_new_message, p_phone)</p>
              <p>Ordem: Invertida</p>
              <p>Erro: Log simples</p>
            </div>
            <div className="bg-slate-950 p-3 rounded border border-orange-500/30">
              <p className="text-slate-500 mb-1">DEPOIS (8270c53):</p>
              <p>RPC: append_wa_message</p>
              <p>Parâmetros: (p_phone, p_new_message)</p>
              <p>Ordem: Padrão Postgres</p>
              <p>Retry: Dinâmico (se falhar signature)</p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-900/20 rounded">
            <h3 className="font-bold text-blue-400 mb-2">EVIDÊNCIA REAL DO POSTGRESQL:</h3>
            <p>Assinatura: <code className="text-white">public.append_wa_message(p_phone text, p_new_message jsonb)</code></p>
            <p>A assinatura (p_new_message, p_phone) em bb50b04 estava <span className="text-red-400">INCORRETA</span>.</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-purple-400">4. AUDITE chat.server.ts</h2>
          <p className="text-slate-400 italic">Comparação com bb50b04 (que era igual a a0bc575):</p>
          <div className="space-y-2 bg-slate-950 p-4 rounded">
            <p><span className="text-slate-500 font-bold">slice(-12)</span>: <span className="text-green-500">PRESERVADO</span> (Linha 339)</p>
            <p><span className="text-slate-500 font-bold">case-insensitive / partial fallback</span>: <span className="text-red-400">ADICIONADO</span> (Linhas 372-376)</p>
            <p className="mt-2 text-xs text-slate-500">Motivo: "Manicure" no catálogo Ventura não batia com "manicure" via normalize().</p>
          </div>
          <div className="mt-4 p-3 border border-red-500/50 rounded bg-red-950/20">
            <p>Necessária para 18:29 = <span className="font-bold">SIM</span> (Catálogo falhou por case)</p>
            <p>Autorizada pelo usuário = <span className="font-bold text-red-500">NÃO</span> (Foi realizada durante a auditoria)</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-cyan-400">5. AUDITORIA DOS TRACES REAIS (18:29 e 18:30)</h2>
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded border-l-4 border-cyan-500">
              <h3 className="text-cyan-400 font-bold mb-2">TRACE_1829: "quero fazer mão hoje"</h3>
              <p><span className="text-slate-500">ID:</span> webhook-1786829396622</p>
              <p><span className="text-slate-500">LOOKUP:</span> "manicure" → <span className="text-red-400">0 candidates</span> (falha case-sensitive)</p>
              <p><span className="text-slate-500">PERSISTÊNCIA:</span> <span className="text-red-500 font-bold">FALHOU</span></p>
              <p><span className="text-slate-500 text-[10px]">Erro:</span> "Could not find the function public.append_wa_message(p_customer_context, ...)"</p>
              <p className="mt-2"><span className="text-slate-300">CAUSA RAIZ 1829:</span> Desalinhamento de assinatura RPC impediu salvar o contexto.</p>
            </div>
            <div className="bg-slate-950 p-4 rounded border-l-4 border-cyan-500">
              <h3 className="text-cyan-400 font-bold mb-2">TRACE_1830: "simples"</h3>
              <p><span className="text-slate-500">ID:</span> webhook-1786829432717</p>
              <p><span className="text-slate-500">CONTEXT_LOADED:</span> <span className="text-red-400">NULL</span> (Não foi salvo em 18:29)</p>
              <p><span className="text-slate-500">AI_RESPONSE:</span> Reiniciou saudação (fluxo perdido).</p>
              <p className="mt-2"><span className="text-slate-300">CAUSA RAIZ 1830:</span> Efeito cascata da falha de persistência anterior.</p>
            </div>
          </div>
        </section>

        <footer className="pt-8 border-t border-slate-800 text-center space-y-4">
          <div className="grid grid-cols-2 gap-2 text-left max-w-md mx-auto bg-slate-900 p-4 rounded border border-slate-800">
            <p>CURRENT_COMMIT: <span className="text-white">8270c53</span></p>
            <p>UNAUTHORIZED_CHANGES: <span className="text-red-500">SIM</span></p>
            <p>PRODUCTION_COMMIT: <span className="text-white">8270c53</span></p>
            <p>SAFE_TO_RETEST: <span className="text-red-500 font-bold">NÃO</span></p>
          </div>
          <p className="text-lg font-bold text-red-500 animate-pulse">PARE E AGUARDE MINHA AUTORIZAÇÃO.</p>
        </footer>
      </div>
    </div>
  );
}
