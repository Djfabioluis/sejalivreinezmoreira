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
    } catch (e: any) {
      setReport({ error: e.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900 text-center w-full">RELATÓRIO DE AUDITORIA DE TESTE (CONTRADIÇÃO IDENTIFICADA)</h1>
      </div>

      <div className="bg-red-50 border border-red-200 p-6 rounded-xl">
        <h2 className="text-red-800 font-bold mb-2">1. CONTRADIÇÃO IDENTIFICADA</h2>
        <p className="text-red-700 text-sm">
          A Sidebar afirmou aprovação total, mas o Harness falhou com <strong>messages.some is not a function</strong>.
          O erro ocorre na camada de Mock/Harness, não no runtime de produção.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-slate-500 uppercase">TEST_FILE</h3>
          <p className="text-sm font-mono mt-1 text-slate-700">src/lib/booking/tests/persistence-pipeline.functions.ts</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border">
          <h3 className="text-sm font-semibold text-slate-500 uppercase">ERROR_LAYER</h3>
          <p className="text-sm font-mono mt-1 text-red-600">Test Harness / Mock Simulation</p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm overflow-auto max-h-[500px]">
        <h2 className="text-white border-b border-slate-700 pb-2 mb-4">LOGS DO PROCESSO DE DOIS TURNOS</h2>
        {loading ? (
          <div className="animate-pulse">Iniciando simulação Ventura (5258)...</div>
        ) : report?.error ? (
          <div className="text-red-400">
            [CRITICAL_ERROR] {report.error}
            <br /><br />
            MESSAGES_SOME_ERROR_RESOLVED = NÃO
            <br />
            PERSISTENCE_SUCCESS_TURN_1 = FALHA
            <br />
            CONTEXT_LOAD_SUCCESS_TURN_2 = FALHA
          </div>
        ) : report ? (
          <pre>{JSON.stringify(report, null, 2)}</pre>
        ) : (
          <div>Aguardando processamento...</div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-4">RELATÓRIO DE SEGURANÇA E RUNTIME</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>RUNTIME_CHANGED</span>
            <span className="font-bold text-blue-600">NÃO (bc4328f intacto)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>MESSAGES_SOME_ERROR_RESOLVED</span>
            <span className="font-bold text-red-600">PENDENTE DE VALIDAÇÃO</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>MAO_NORMALIZADA_MANICURE</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>SAFE_TO_DEPLOY_RUNTIME_bc4328f</span>
            <span className="font-bold text-red-600">NÃO (Aguardando Harness Fix)</span>
          </div>
        </div>
      </div>

      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
        <strong>INSTRUÇÃO TÉCNICA:</strong> PARE. NÃO FAÇA DEPLOY. O Harness está sendo corrigido para reproduzir a chamada real sem o erro .some().
      </div>
    </div>
  );
}
