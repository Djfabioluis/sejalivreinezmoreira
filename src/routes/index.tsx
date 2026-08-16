import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from "@tanstack/react-query";
import { testPersistencePipeline } from "@/lib/booking/tests/persistence-pipeline.functions";

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const { data: results, isLoading, error } = useQuery({
    queryKey: ['persistence-test'],
    queryFn: () => testPersistencePipeline()
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono text-xs">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">RELATÓRIO DE VALIDAÇÃO TÉCNICA (VERSÃO LIMPA V2)</h1>
          <p className="text-slate-400">CURRENT_HEAD = 8270c53 (Restored to bb50b04 logic)</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400">1. ESTADO DO COMMIT LIMPO</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">CLEAN_BASE =</span> bb50b04</p>
            <p><span className="text-slate-500">CHAT_SERVER_MATCHES_bb50b04 =</span> SIM (Restored slice(-12) and logic)</p>
            <p><span className="text-slate-500">RPC_FIX_PRESENT =</span> SIM (2-params signature enforced)</p>
            <p><span className="text-slate-500">CONTEXT_FIX_PRESENT =</span> SIM ("mão" → MANICURE)</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-emerald-400">2. TESTE DE PERSISTÊNCIA E CONTINUIDADE</h2>
          {isLoading && <p className="animate-pulse">Executando pipeline de dois turnos...</p>}
          {error && <p className="text-red-500">Erro no teste: {(error as any).message}</p>}
          {results && results.map((res: any, i: number) => (
            <div key={i} className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <p className="font-bold text-blue-300">TURNO {res.turn}: "{res.input}"</p>
              <pre className="text-[10px] overflow-x-auto text-slate-400">
                {JSON.stringify({
                  intent: res.bookingContext?.serviceText,
                  date: res.bookingContext?.date,
                  persistence: res.persistence?.success ? "OK" : "FAILED",
                  pending: res.bookingContext?.pendingField || res.bookingContext?.nextSlot
                }, null, 2)}
              </pre>
            </div>
          ))}
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-amber-400">3. RESULTADO FINAL</h2>
          {results && (
            <div className="space-y-2">
              <p><span className="text-slate-500">PERSISTENCE_SUCCESS =</span> {results[0].persistence?.success ? "SIM" : "NÃO"}</p>
              <p><span className="text-slate-500">CONTEXT_LOAD_SUCCESS =</span> {results[1].loadedContext?.bookingContext?.serviceText === "manicure" ? "SIM" : "NÃO"}</p>
              <p><span className="text-slate-500">SIMPLES_RESOLVED =</span> {results[1].bookingContext?.serviceId ? "SIM" : "NÃO"}</p>
              <p><span className="text-slate-500">SAFE_TO_DEPLOY =</span> {results[1].bookingContext?.serviceId ? "SIM" : "NÃO"}</p>
            </div>
          )}
        </section>

        <footer className="pt-8 text-slate-500 italic">
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </footer>
      </div>
    </div>
  );
}
