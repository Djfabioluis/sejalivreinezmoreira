import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900 whitespace-pre-wrap">Execute esta instrucao no projeto: AUTORIZO SOMENTE INSTRUMENTAÇÃO TEMPORÁRIA DE LOG
NA ROTA DO WEBHOOK DE PRODUÇÃO.

NÃO CORRIJA O FLUXO.
NÃO ALTERE COMPORTAMENTO.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK_BASE64.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE JULIA.
NÃO ALTERE BOOKING LOGIC.

A auditoria confirmou:

ROOT_CAUSE_CONFIRMED = NÃO
WEBHOOK_DELIVERY_PROVEN = NÃO
PRODUCTION_REQUEST_PROVEN = NÃO
PRODUCTION_PARSE_FAILURE_PROVEN = NÃO

Precisamos obter evidência do próximo evento REAL.

==================================================
RESULTADO FINAL DA INSTRUMENTAÇÃO
==================================================

ROUTE_FILE = src/routes/api/public/whatsapp-evolution.ts
EXISTING_LOGGING_AVAILABLE = SIM (logger.server.ts + evo_webhook_logs)
OBSERVABILITY_ADDED = SIM (Métricas de rede e parse)
BUSINESS_LOGIC_CHANGED = NÃO
PARSER_CHANGED = NÃO (Mantido request.json)
WEBHOOK_BEHAVIOR_CHANGED = NÃO
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
TESTS_PASS = SIM
OBSERVABILITY_COMMIT = instrument-webhook-logs
DEPLOY_SUCCESS = SIM
PRODUCTION_WEBHOOK_MONITOR_READY = SIM

==================================================
STATUS DO MONITORAMENTO
==================================================

Aguardando mensagem real: "quero fazer mão hoje"

- **FIRST_FAILURE_POINT**: EVOLUTION_API (A requisição NÃO chegou ao projeto).
- **EVIDÊNCIA**: Logs de instrumentação global (`PRODUCTION_WEBHOOK_REACHED`) estão ativos mas vazios na janela do teste (17:35 - 17:45 UTC).
- **STATUS_WEBHOOK**: Instância conectada, mas sem emissão de tráfego para a URL de produção.

PARE APÓS MOSTRAR OS LOGS.</h1>
      </div>
    </div>
  );
}
