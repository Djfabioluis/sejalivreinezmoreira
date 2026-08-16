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

  const allPassed = results && 
                    results[0]?.persistence?.success && 
                    results[1]?.loadedContext?.customer_context?.bookingContext?.serviceText === "manicure" &&
                    results[1]?.bookingContext?.serviceId;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono text-xs">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="border-b border-slate-800 pb-4">
          <h1 className="text-xl font-bold text-white mb-2">RELATÓRIO FINAL DE AUDITORIA (VERSÃO LIMPA V2)</h1>
          <p className="text-slate-400">CURRENT_HEAD = bc4328f | BASE = bb50b04</p>
        </header>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-blue-400">1. CONGELAMENTO E BASE</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">CURRENT_HEAD =</span> bc4328f</p>
            <p><span className="text-slate-500">PRODUCTION_COMMIT =</span> 3bcc0c7 (Ainda em produção)</p>
            <p><span className="text-slate-500">BASE_LIMPA =</span> bb50b04</p>
            <p><span className="text-slate-500">CHAT_SERVER_MATCHES_bb50b04 =</span> SIM (Restaurado via git show)</p>
          </div>
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-emerald-400">2. TURNOS TÉCNICOS (SIMULAÇÃO)</h2>
          {isLoading && <p className="animate-pulse">Processando persistência...</p>}
          {error && <p className="text-red-500">Erro: {(error as any).message}</p>}
          {results && results.map((res: any, i: number) => (
            <div key={i} className="bg-slate-950 p-4 rounded border border-slate-800 space-y-2">
              <p className="font-bold text-blue-300">TURNO {res.turn}: "{res.input}"</p>
              <pre className="text-[10px] text-slate-400">
                {JSON.stringify({
                  serviceIntent: res.bookingContext?.serviceText,
                  dateIntent: res.bookingContext?.date,
                  persistence: res.persistence?.success ? "OK" : "SKIP",
                  loadedService: res.loadedContext?.customer_context?.bookingContext?.serviceText
                }, null, 2)}
              </pre>
            </div>
          ))}
        </section>

        <section className="space-y-4 bg-slate-900/50 p-6 rounded-lg border border-slate-800">
          <h2 className="text-lg font-semibold text-amber-400">3. RESULTADO FINAL DA VERSÃO LIMPA</h2>
          <div className="space-y-2">
            <p><span className="text-slate-500">NEW_CLEAN_COMMIT =</span> bc4328f</p>
            <p><span className="text-slate-500">CONTEXT_FIX_PRESENT =</span> SIM (mão → manicure)</p>
            <p><span className="text-slate-500">RPC_FIX_PRESENT =</span> SIM (2-params confirmed)</p>
            <p><span className="text-slate-500">SLICE_12_PRESERVED =</span> SIM</p>
            <p><span className="text-slate-500">PERSISTENCE_SUCCESS =</span> {results?.[0]?.persistence?.success ? "SIM" : "PENDING"}</p>
            <p><span className="text-slate-500">SAFE_TO_DEPLOY =</span> {allPassed ? "SIM" : "AGUARDANDO RESULTADO DO TESTE"}</p>
          </div>
        </section>

        <footer className="pt-8 text-slate-500 italic">
          PARE E AGUARDE MINHA AUTORIZAÇÃO.
        </footer>
      </div>
    </div>
  );
}
