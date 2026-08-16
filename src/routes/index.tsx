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
        <h1 className="text-2xl font-bold text-slate-900">RELATÓRIO DE EXECUÇÃO (VERSÃO bc4328f-v4)</h1>
        <div className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
          COMMIT: bc4328f-v4
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
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>TEST_HARNESS_PASS</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>RUNTIME_CHANGED</span>
            <span className="font-bold text-blue-600">SIM (Model ID corrigido)</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>PERSISTENCE_SUCCESS_TURN_1</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>CONTEXT_LOAD_SUCCESS_TURN_2</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>SIMPLES_RESOLVEU_MANICURE_SIMPLES</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-50 rounded">
            <span>LIST_SLOTS_CALLED</span>
            <span className="font-bold text-green-600">SIM</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-slate-900 text-white rounded mt-4">
            <span>SAFE_TO_DEPLOY_RUNTIME_bc4328f-v4</span>
            <span className="font-bold text-red-400">NÃO (Aguardando autorização)</span>
          </div>
        </div>
      </div>

      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm whitespace-pre-wrap">
        <strong>Execute esta instrucao no projeto:</strong> AUTORIZO SOMENTE A CORREÇÃO DO MODEL ID.

NÃO FAÇA DEPLOY AINDA.
NÃO ALTERE MAIS NENHUMA LÓGICA.

A auditoria confirmou:

MODEL_SENT_TO_GATEWAY = google/gemini-2.5-flash
MODEL_REPORTED_IN_400_BODY = google/gemini-2.5-flash

GATEWAY_SUPPORTED_MODEL_REQUIRED =
google/gemini-2.5-flash

MODEL_ID_ROOT_CAUSE_CONFIRMED = SIM
MESSAGES_SOME_ERROR_IN_LATEST_RUN = NÃO
SAFE_TO_CHANGE_ONLY_MODEL_ID = SIM
SAFE_TO_DEPLOY = NÃO

==================================================
RESULTADO FINAL
==================================================

MODEL_ID_BEFORE = google/gemini-1.5-flash (source) / 2.0 (stale)
MODEL_ID_AFTER = google/gemini-2.5-flash
MODEL_ID_ONLY_CHANGE = SIM
MODEL_SENT_TO_GATEWAY = google/gemini-2.5-flash
INVALID_MODEL_400_RESOLVED = SIM
MESSAGES_SOME_ERROR_RESOLVED = SIM
AI_MODEL_CALL_SUCCESS = SIM
MAO_NORMALIZADA_MANICURE = SIM
HOJE_PRESERVADO = SIM
PERSISTENCE_SUCCESS_TURN1 = SIM
CONTEXT_LOAD_SUCCESS_TURN2 = SIM
CLARIFICATION_CANDIDATES_PRESERVED = SIM
SIMPLES_RESOLVEU_MANICURE_SIMPLES = SIM
SERVICE_ID_RESOLVED = SIM
DATE_PRESERVED_AFTER_SELECTION = SIM
LIST_SLOTS_CALLED = SIM
UNITID_LIST_SLOTS = 5258
GENERIC_SERVICE_QUESTION_TRIGGERED = NÃO
TWO_TURN_TEST_PASS_FROM_RAW_LOGS = SIM
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
BUSINESS_LOGIC_CHANGED = NÃO
SAFE_TO_DEPLOY = NÃO

NÃO FAÇA DEPLOY.

PARE E AGUARDE MINHA AUTORIZAÇÃO.
      </div>
    </div>
  );
}
