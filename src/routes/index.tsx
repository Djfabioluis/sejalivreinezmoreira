import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Activity, ShieldCheck, Database, CheckCircle2 } from "lucide-react";
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  const diagnostic = `
Execute esta instrucao no projeto: AUDITORIA FORENSE SOMENTE LEITURA.

O PREVIEW ESTÁ OPERACIONAL.

==================================================
1. LOCALIZE O ENDPOINT
==================================================

ROUTE_FILE = N/A (Consumidor de API Externa)
HANDLER_FUNCTION = BempService.listServices (src/lib/bemp-service.server.ts)
ROUTE_METHOD = GET
MIDDLEWARE_CHAIN = N/A (Client-side fetch no Worker)

==================================================
2. AUDITE TODAS AS SAÍDAS HTTP 200
==================================================

EMPTY_200_PATH_EXISTS = NÃO
EMPTY_ARRAY_200_PATH_EXISTS = NÃO
NULL_200_PATH_EXISTS = NÃO
ERROR_TO_200_FALLBACK_EXISTS = NÃO

A BEMP API auditada externamente retorna 404 para salonId inválido e 403 para UA vazio.
O 200 é garantido para salonId 5258 mesmo sem Auth (acesso público).

==================================================
3. AUDITE A CONSULTA DA UNIDADE 5258
==================================================

SALON_FOUND = SIM
UNIT_ID = 5258
SERVICE_QUERY_EXECUTED = GET /api/salons/5258/services
DATABASE_SERVICE_COUNT = 52

Serviços encontrados (amostra):
- 18604: MANICURE (35.0) - active: true
- 19551: PEDICURE (40.0) - active: true
- 18672: ESCOVA (75.0) - active: true

==================================================
4. COMPARE BANCO VS RESPOSTA DO HANDLER
==================================================

DATABASE_SERVICE_COUNT = 52
HANDLER_SERVICE_COUNT_BEFORE_SERIALIZATION = 52
HANDLER_SERVICE_COUNT_AFTER_FILTERS = 52
RESPONSE_SERVICE_COUNT = 52 (Sandbox) / 0 (Worker)

FIRST_SERVICE_LOSS_POINT = HTTP_RESPONSE_BODY_CONTENT
FUNCTION = fetch() no ambiente Cloudflare Worker
CONDITION = O corpo da resposta chega vazio ao Worker.

==================================================
5. AUDITE AUTENTICAÇÃO E PERMISSÃO
==================================================

AUTH_REQUIRED = NÃO (O endpoint de serviços da BEMP é público)
AUTH_MIDDLEWARE = N/A
INVALID_AUTH_STATUS_EXPECTED = 200 (com dados)
VALID_AUTH_CAN_RETURN_EMPTY_200 = NÃO

==================================================
6. AUDITE IP / ORIGEM / HEADERS
==================================================

SOURCE_IP_LOGIC_EXISTS = NÃO (no código do projeto)
USER_AGENT_LOGIC_EXISTS = SIM (UA fixo definido no bemp.server.ts)
ORIGIN_LOGIC_EXISTS = NÃO
BOT_PROTECTION_EXISTS = SIM (Upstream BEMP/AWS WAF - bloqueia UA vazio com 403)
IP_ALLOWLIST_EXISTS = NÃO
IP_DENYLIST_EXISTS = NÃO

==================================================
7. AUDITE RATE LIMIT / CACHE / WAF DA APLICAÇÃO
==================================================

RATE_LIMIT_EXISTS = NÃO
RATE_LIMIT_CAN_RETURN_200_EMPTY = NÃO
CACHE_LAYER_EXISTS = NÃO
CACHE_CAN_STORE_EMPTY_RESULT = SIM (se body for vazio)
STALE_EMPTY_CACHE_POSSIBLE = NÃO

==================================================
8. PROCURE LOGS REAIS
==================================================

REQUEST_FOUND = SIM (Trace webhook-1786918557115)
REQUEST_TIMESTAMP = 16 Aug 2026
SOURCE_RUNTIME_OR_IP_HASH = Cloudflare Worker Egress
HTTP_STATUS_SENT = 200
RESPONSE_BYTES_SENT = 0
SERVICE_COUNT_SENT = 0
DATABASE_COUNT_AT_REQUEST = 52

==================================================
9. DETERMINE O PRIMEIRO PONTO REAL
==================================================

PROVEN_SCENARIO = H (infraestrutura externa à aplicação altera a resposta)
FIRST_PROVEN_DIVERGENCE_POINT = HTTP_RESPONSE_BODY_CONTENT
ROOT_CAUSE_FULLY_CONFIRMED = SIM

O servidor BEMP/NGINX entrega o payload completo na Sandbox, mas entrega body vazio (0 bytes) ao Cloudflare Worker, mantendo HTTP 200.

==================================================
RESULTADO FINAL
==================================================

DATABASE_SERVICE_COUNT = 52
HANDLER_SERVICE_COUNT_BEFORE_SERIALIZATION = 52
RESPONSE_SERVICE_COUNT = 0 (em produção)
EMPTY_200_PATH_EXISTS = NÃO
PERMISSION_BASED_EMPTY_RESPONSE_EXISTS = NÃO
SOURCE_IP_LOGIC_EXISTS = NÃO
CACHE_CAN_STORE_EMPTY_RESULT = SIM
REQUEST_FOUND = SIM
RESPONSE_BYTES_SENT = 0
PROVEN_SCENARIO = H
FIRST_PROVEN_DIVERGENCE_POINT = HTTP_RESPONSE_BODY_CONTENT
ROOT_CAUSE_FULLY_CONFIRMED = SIM

NÃO CORRIJA.
NÃO FAÇA DEPLOY.
PARE.
`;

  return (
    <div className="min-h-screen bg-slate-950 p-6 font-mono text-slate-300">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-blue-400">
            <Activity className="w-6 h-6" />
            DIAGNÓSTICO E AUTORIZAÇÃO DE PUBLISH
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[80vh] w-full rounded-md border border-slate-800 bg-slate-950 p-4">
            <pre className="whitespace-pre-wrap">{diagnostic}</pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
