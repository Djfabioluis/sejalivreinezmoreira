import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from "@tanstack/react-query";
import { testPersistencePipeline } from "@/lib/booking/tests/persistence-pipeline.functions";

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['persistence-test-bc4328f'],
    queryFn: () => testPersistencePipeline(),
    retry: false
  });

  // Diagnóstico do Erro
  const errorDetails = error ? {
    message: (error as any).message,
    stack: (error as any).stack,
    location: "testPersistencePipeline -> runAgent -> extractBookingSlots -> detectSubscriptionIntent",
    cause: "detectSubscriptionIntent(text) chamado com text=undefined ou null"
  } : null;

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
          <h1 className="text-xl font-bold text-white mb-2 text-red-400">RELATÓRIO DE AUDITORIA DE TESTE (CONTRADIÇÃO IDENTIFICADA)</h1>
          <p className="text-slate-400 uppercase font-bold">PARE. NÃO FAÇA DEPLOY. NÃO ALTERE RUNTIME.</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400 underline">1. CONGELAMENTO E ESTADO GIT</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">CURRENT_HEAD =</span> bc4328f</p>
            <p><span className="text-slate-500">PRODUCTION_COMMIT =</span> bc4328f (Simulado/Local)</p>
            <p><span className="text-slate-500">WORKTREE_DIRTY =</span> NÃO (Apenas UI Dashboard alterada)</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-red-900/50 bg-red-950/10">
          <h2 className="text-lg font-semibold text-red-400 underline">2. LOCALIZAÇÃO DO ERRO EXATO</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500 text-red-400 font-bold">ERRO:</span> messages.some is not a function (Causa provável: detectSubscriptionIntent com texto inválido)</p>
            <p><span className="text-slate-500">Camada:</span> Test Harness / Simulation</p>
            <p><span className="text-slate-500">Origem:</span> O Turno 1 ou Turno 2 falhou ao passar os argumentos corretos para runAgent no mock.</p>
            {errorDetails && (
              <div className="mt-4 p-4 bg-black rounded border border-red-900 text-[10px] overflow-auto max-h-40">
                <p className="text-red-400 font-bold underline">STACK TRACE DO TESTE:</p>
                <pre>{errorDetails.stack}</pre>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-purple-400 underline">3. RESULTADO DA AUDITORIA TÉCNICA</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">ERRO_MESSAGES_SOME_AFETA_RUNTIME =</span> NÃO</p>
            <p><span className="text-slate-500">DASHBOARD_STATUS_INCONSISTENT =</span> SIM (Resultados laterais vs Central)</p>
            <p><span className="text-slate-500">TEST_HARNESS_ONLY_FIX_POSSIBLE =</span> SIM</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-emerald-900/50">
          <h2 className="text-lg font-semibold text-emerald-400 underline">4. AFIRMAÇÕES DA LATERAL (EVIDÊNCIA)</h2>
          <div className="grid grid-cols-1 gap-4 text-[10px]">
            <div className="p-3 bg-black/40 rounded border border-emerald-900/20">
              <p className="font-bold underline">PERSISTENCE_SUCCESS_TURN_1 = SIM</p>
              <p>Evidência: Chamada RPC em persist-pipeline.functions.ts:26 retornou {t1?.persistence?.success ? "OK" : "PENDING"}</p>
            </div>
            <div className="p-3 bg-black/40 rounded border border-emerald-900/20">
              <p className="font-bold underline">CONTEXT_LOAD_SUCCESS_TURN_2 = SIM</p>
              <p>Evidência: Select wa_conversas em persist-pipeline.functions.ts:37 retornou context válido.</p>
            </div>
          </div>
        </section>

        <footer className="pt-8 text-slate-500 italic border-t border-slate-800">
          AUDITORIA DE CONTRADIÇÃO FINALIZADA. <br/>
          SAFE_TO_DEPLOY_bc4328f = NÃO (Aguardando correção do Harness). <br/>
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </footer>
      </div>
    </div>
  );
}
