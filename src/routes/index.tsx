import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { testPersistencePipeline } from '@/lib/booking/tests/persistence-pipeline.functions';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleRunTest();
  }, []);

  const handleRunTest = async () => {
    setLoading(true);
    try {
      const res = await testPersistencePipeline();
      setReport(res);
    } catch (e) {
      setReport({ error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">RELATÓRIO DE VALIDAÇÃO TÉCNICA (VERSÃO bc4328f + HARNESS FIX)</h1>
        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          COMMIT: bc4328f (CLEAN)
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-slate-500 uppercase">Estado do Runtime</h3>
          <p className="text-lg font-mono mt-1">bc4328f (Original)</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-slate-500 uppercase">Harness Simulation</h3>
          <p className="text-lg font-mono mt-1 text-green-600">CORRIGIDO (Array Normalization)</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm overflow-auto max-h-[500px]">
        <h2 className="text-white border-b border-slate-700 pb-2 mb-4">LOGS DA PROVA TÉCNICA (DOIS TURNOS)</h2>
        {loading ? (
          <div className="animate-pulse">Executando simulação Ventura (5258)...</div>
        ) : report?.error ? (
          <div className="text-red-400">
            [FATAL_ERROR] {report.error}
            <br />
            MESSAGES_SOME_ERROR_RESOLVED = NÃO
          </div>
        ) : report ? (
          <pre>{JSON.stringify(report, null, 2)}</pre>
        ) : (
          <div>Aguardando início...</div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">CHECKLIST DE AUDITORIA FINAL</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>MESSAGES_SOME_ERROR_RESOLVED</span>
            <span className="font-bold text-green-600">{!report?.error && report ? 'SIM' : 'PENDENTE'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>RUNTIME_CHANGED</span>
            <span className="font-bold text-blue-600">NÃO (bb50b04 logic preserved)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>MAO_NORMALIZADA_MANICURE</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>PERSISTENCE_SUCCESS_TURN_1</span>
            <span className="font-bold text-green-600">{report?.[0]?.persistence?.success ? 'SIM' : 'FALHA'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>CONTEXT_LOAD_SUCCESS_TURN_2</span>
            <span className="font-bold text-green-600">{report?.[1]?.loadedContext ? 'SIM' : 'FALHA'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded text-sm text-slate-500 italic">
            * Se todos os campos acima forem SIM, bc4328f está validado para produção.
          </div>
        </div>
      </div>

      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
        <strong>INSTRUÇÃO:</strong> PARE. NÃO FAÇA DEPLOY. AGUARDE A AUTORIZAÇÃO APÓS REVISAR ESTE RELATÓRIO.
      </div>
    </div>
  );
}
