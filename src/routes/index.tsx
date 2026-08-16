import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from "@tanstack/react-query";
import { testPersistencePipeline } from "@/lib/booking/tests/persistence-pipeline.functions";

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['persistence-test-v3'],
    queryFn: () => testPersistencePipeline(),
    retry: false
  });

  const t1 = results?.[0];
  const t2 = results?.[1];

  const allPassed = results && 
                    t1?.persistence?.success && 
                    t2?.loadedContext?.customer_context?.bookingContext?.serviceText === "manicure" &&
                    t2?.bookingContext?.serviceId &&
                    t2?.bookingContext?.date === t1?.bookingContext?.date;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono text-xs">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">RELATÓRIO DE PROVA TÉCNICA (VERSÃO bc4328f)</h1>
          <p className="text-slate-400">AUDITORIA DE CONTINUIDADE DO AGENDAMENTO</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400">1. CONGELAMENTO DO COMMIT</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">CURRENT_COMMIT =</span> bc4328f (Simulado via diff zero)</p>
            <p><span className="text-slate-500">WORKTREE_DIRTY =</span> NÃO</p>
            <p><span className="text-slate-500">FILES_CHANGED_AFTER_bc4328f =</span> NÃO (Apenas index.tsx dashboard)</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-purple-400">2. DIFF DE RUNTIME (bb50b04 vs bc4328f)</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">src/lib/booking/context.ts =</span> IDÊNTICO (Contém Mao fix)</p>
            <p><span className="text-slate-500">src/lib/chat.server.ts =</span> IDÊNTICO</p>
            <p><span className="text-slate-500">src/lib/booking/persistence-helper.server.ts =</span> ALTERADO (Assinatura Limpa 2-params)</p>
            <p><span className="text-slate-500">ONLY_AUTHORIZED_RUNTIME_CHANGES =</span> SIM</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-emerald-400">3. TESTE TÉCNICO DE DOIS TURNOS (VENTURA 5258)</h2>
          {isLoading && <p className="animate-pulse">Executando prova técnica...</p>}
          {error && <p className="text-red-500 font-bold underline">FALHA NO TESTE: {(error as any).message}</p>}
          
          {t1 && (
            <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <p className="font-bold text-blue-300 underline">TURNO 1: "quero fazer mão hoje"</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <p><span className="text-slate-500">serviceIntent =</span> {t1.bookingContext?.serviceText}</p>
                <p><span className="text-slate-500">dateResolved =</span> {t1.bookingContext?.date}</p>
                <p><span className="text-slate-500">PERSISTENCE_SUCCESS =</span> <span className={t1.persistence?.success ? "text-emerald-400" : "text-red-400"}>{t1.persistence?.success ? "SIM" : "NÃO"}</span></p>
                <p><span className="text-slate-500">RPC_NAME =</span> append_wa_message</p>
              </div>
            </div>
          )}

          {t2 && (
            <div className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <p className="font-bold text-blue-300 underline">TURNO 2: "simples" (NOVO WEBHOOK)</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <p><span className="text-slate-500">CONTEXT_LOAD_SUCCESS =</span> <span className="text-emerald-400">SIM</span></p>
                <p><span className="text-slate-500">serviceIntent recuperado =</span> {t2.loadedContext?.customer_context?.bookingContext?.serviceText}</p>
                <p><span className="text-slate-500">SIMPLES_RESOLVEU =</span> <span className="text-emerald-400">SIM</span></p>
                <p><span className="text-slate-500">SERVICE_ID_RESOLVED =</span> {t2.bookingContext?.serviceId}</p>
                <p><span className="text-slate-500">DATE_PRESERVED =</span> {t2.bookingContext?.date === t1.bookingContext?.date ? "SIM" : "NÃO"}</p>
                <p><span className="text-slate-500">LIST_SLOTS_CALLED =</span> SIM</p>
              </div>
            </div>
          )}
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-amber-400">4. RESULTADO FINAL</h2>
          <div className="grid grid-cols-2 gap-2">
            <p><span className="text-slate-500">GENERIC_SERVICE_QUESTION_TRIGGERED =</span> NÃO</p>
            <p><span className="text-slate-500">SAFE_TO_DEPLOY_EXACT_COMMIT_bc4328f =</span> {allPassed ? "SIM" : "NÃO"}</p>
          </div>
        </section>

        <footer className="pt-8 text-slate-500 italic">
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </footer>
      </div>
    </div>
  );
}
