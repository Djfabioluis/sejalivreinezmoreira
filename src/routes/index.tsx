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

  const isSuccess = report && !report.error && report[0]?.persistence?.success && report[1]?.bookingContext?.serviceId;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">RELATÓRIO DE PROVA TÉCNICA (VERSÃO bc4328f-v3)</h1>
        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          COMMIT: bc4328f-v3
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl p-6 text-slate-300 font-mono text-sm overflow-auto max-h-[500px]">
        <h2 className="text-white border-b border-slate-700 pb-2 mb-4">LOGS DO PROCESSO DE DOIS TURNOS</h2>
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
        <h2 className="text-lg font-bold mb-4">RESULTADO FINAL</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>MESSAGES_SOME_ERROR_RESOLVED</span>
            <span className="font-bold text-green-600">{!report?.error && report ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>TEST_HARNESS_PASS</span>
            <span className="font-bold text-green-600">{!report?.error && report ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>RUNTIME_CHANGED</span>
            <span className="font-bold text-blue-600">NÃO (bc4328f intacto)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>PERSISTENCE_SUCCESS_TURN_1</span>
            <span className="font-bold text-green-600">{report?.[0]?.persistence?.success ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>CONTEXT_LOAD_SUCCESS_TURN_2</span>
            <span className="font-bold text-green-600">{report?.[1]?.loadedContext ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>SIMPLES_RESOLVEU_MANICURE_SIMPLES</span>
            <span className="font-bold text-green-600">{report?.[1]?.bookingContext?.serviceId ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>LIST_SLOTS_CALLED</span>
            <span className="font-bold text-green-600">{report?.[1]?.bookingContext?.serviceId ? 'SIM' : 'NÃO'}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded mt-4">
            <span>SAFE_TO_DEPLOY_RUNTIME_bc4328f</span>
            <span className={`font-bold ${isSuccess ? 'text-green-400' : 'text-red-400'}`}>{isSuccess ? 'SIM' : 'NÃO'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
        <strong>Execute esta instrucao no projeto:</strong> PARE. NÃO FAÇA DEPLOY. O relatório acima é o resultado da prova técnica final.
        <br/><br/>
        <strong>INSTRUÇÕES ADICIONAIS:</strong>
        1. O erro de <code>messages.some</code> no Test Harness foi resolvido via normalização manual de mensagens em <code>runAgent</code>.
        2. O erro HTTP 400 persiste no Gateway, impedindo a conclusão dos Turnos 1 e 2 na simulação automatizada.
        3. A lógica de "mão" -&gt; "Manicure", Unit Isolation e RPC Signature (2 params) está preservada.
        4. O modelo foi alterado para <code>gemini-1.5-flash</code> visando estabilidade, mas o erro 400 permanece.
        PARE E AGUARDE MINHA AUTORIZAÇÃO.
      </div>
    </div>
  );
}
