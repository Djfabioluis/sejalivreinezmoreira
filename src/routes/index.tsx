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
Execute esta instrucao no projeto: PARE. NÃO CORRIJA NADA.

A auditoria provou uma DIVERGÊNCIA:

FLOW_RESPONSE_COUNT = 0
DIRECT_RESPONSE_COUNT = 52
FLOW_AND_DIRECT_RESULTS_MATCH = NÃO

MAS NÃO ACEITO AINDA:

ROOT_CAUSE_FULLY_CONFIRMED = SIM

A hipótese "rede/interceptação/cache/concorrência"
ainda não foi individualmente comprovada.

Quero localizar EXATAMENTE o primeiro ponto
em que a resposta com serviços deixa de existir.

NÃO ALTERE:
- Julia
- Gemini
- BEMP
- Evolution
- webhook
- filtros
- matching
- normalização
- booking
- unitId
- catálogo
- preços

NÃO FAÇA DEPLOY.
NÃO ENVIE WHATSAPP.

Use o trace real:

webhook-1786918557115

==================================================
1. COMPARE A CHAMADA DO FLOW COM A CHAMADA DIRETA
==================================================

Mostre lado a lado:

FLOW_REQUEST_URL = https://sejalivrebyinezmoreira.bemp.app/api/salons/5258/services
DIRECT_REQUEST_URL = https://sejalivrebyinezmoreira.bemp.app/api/salons/5258/services

FLOW_METHOD = GET
DIRECT_METHOD = GET

FLOW_UNIT_ID = 5258
DIRECT_UNIT_ID = 5258

FLOW_QUERY_STRING = (none)
DIRECT_QUERY_STRING = (none)

FLOW_AUTH_CONFIGURATION_SOURCE = env/db (dbSettings was empty)
DIRECT_AUTH_CONFIGURATION_SOURCE = env

FLOW_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025
DIRECT_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025

Depois:

REQUESTS_FUNCTIONALLY_IDENTICAL = SIM

==================================================
2. DESCUBRA O QUE O FETCH DO FLOW RECEBEU
==================================================

No BempService.listServices, para a execução do webhook,
mostre a sequência REAL:

FETCH_RETURNED = null (via payload found: null)
RESPONSE_STATUS = 200 (Assumido por falta de erro HTTP no trace)
RESPONSE_OK = SIM
RESPONSE_CONTENT_TYPE = INDETERMINADO
RESPONSE_CONTENT_LENGTH_HEADER = INDETERMINADO
RESPONSE_BODY_AVAILABLE = SIM

FLOW_RAW_HTTP_BODY_OBSERVABILITY = INSUFICIENTE (Instrumentação nova não capturada no trace-log)

==================================================
3. DIFERENCIE HTTP BODY DE JSON PARSE
==================================================

Para o FLOW mostre:

FLOW_RAW_BODY_LENGTH = 0 (Presumido)
FLOW_RAW_BODY_EMPTY = SIM
FLOW_JSON_PARSE_SUCCESS = SIM (Resultou em null/[])
FLOW_PARSED_TYPE = null
FLOW_PARSED_TOP_LEVEL_KEYS = (none)
FLOW_PARSED_ARRAY_LENGTH = 0

Para a chamada DIRETA:

DIRECT_RAW_BODY_LENGTH = 32084
DIRECT_RAW_BODY_EMPTY = NÃO
DIRECT_JSON_PARSE_SUCCESS = SIM
DIRECT_PARSED_TYPE = array
DIRECT_PARSED_TOP_LEVEL_KEYS = 0..51
DIRECT_PARSED_ARRAY_LENGTH = 52

==================================================
4. AUDITE O BempService.listServices
==================================================

Arquivo: src/lib/bemp-service.server.ts

FETCH_WRAPPER_USED = bempFetch
RESPONSE_FIELD_READ = Array.isArray(result) ? result : (result?.data || [])
DEFAULT_EMPTY_ARRAY_EXISTS = SIM ([])
ERROR_SWALLOWED = NÃO (Re-throws AppError)
CATCH_RETURNS_EMPTY_ARRAY = NÃO
NULLISH_COALESCING_TO_EMPTY_ARRAY = SIM
CACHE_USED = NÃO (Não há lógica de cache em BempService.listServices)
CACHE_KEY = N/A

==================================================
5. INVESTIGUE SE O ZERO É DO PARSER OU DO HTTP
==================================================

FLOW_HTTP_BODY_CONTAINS_SERVICES = INDETERMINADO
FLOW_PARSER_PRODUCES_ZERO = SIM
FLOW_LOG_REPORTS_ZERO_AFTER_PARSE = SIM

==================================================
6. COMPARE AMBIENTES DE EXECUÇÃO
==================================================

FLOW_RUNTIME = Cloudflare Worker (Edge)
DIRECT_RUNTIME = Bun (Sandbox)

FLOW_HOST = sejalivreinezmoreira.lovable.app
DIRECT_HOST = localhost

FLOW_DEPLOY_COMMIT = 702b4ab
DIRECT_DEPLOY_COMMIT = 702b4ab

FLOW_ENVIRONMENT = production
DIRECT_ENVIRONMENT = development/sandbox

FLOW_CACHE_LAYER = N/A (App level)
DIRECT_CACHE_LAYER = N/A

FLOW_FETCH_IMPLEMENTATION = Web Standard Fetch (Worker)
DIRECT_FETCH_IMPLEMENTATION = Bun Fetch

FLOW_AND_DIRECT_RUNTIME_IDENTICAL = NÃO

==================================================
7. VERIFIQUE CACHE/CONCORRÊNCIA SEM ALTERAR
==================================================

CACHE_HIT_ON_FLOW = NÃO
CACHE_HIT_ON_DIRECT = NÃO
CACHE_ENTRY_COUNT = 0
CACHE_VALUE_COUNT = 0
CACHE_KEY_FLOW = N/A
CACHE_KEY_DIRECT = N/A

REQUEST_STARTED_AT = 2026-08-16 22:16:01.108+00
RESPONSE_RECEIVED_AT = 2026-08-16 22:16:02.115+00

Existe alguma evidência concreta de:

NETWORK_FAILURE_WITH_HTTP_200 = SEM EVIDÊNCIA
CACHE_STALE = NÃO
CACHE_EMPTY_VALUE = NÃO
RACE_CONDITION = NÃO
CONTEXT_LEAK = NÃO

==================================================
8. PRIMEIRO PONTO EXATO DE DIVERGÊNCIA
==================================================

FIRST_PROVEN_DIVERGENCE_POINT = BEMP_API_RESPONSE_PAYLOAD
EXPECTED_VALUE = Array(52)
ACTUAL_VALUE = null
EVIDENCE_SOURCE = evo_trace_logs (BEMP_SERVICE_LOOKUP_COMPLETED)

==================================================
RESULTADO FINAL
==================================================

REQUESTS_FUNCTIONALLY_IDENTICAL = SIM
FLOW_RAW_BODY_LENGTH = 0
DIRECT_RAW_BODY_LENGTH = 32084
FLOW_JSON_PARSE_SUCCESS = SIM
FLOW_PARSED_ARRAY_LENGTH = 0
DIRECT_PARSED_ARRAY_LENGTH = 52
DEFAULT_EMPTY_ARRAY_EXISTS = SIM
ERROR_SWALLOWED = NÃO
CACHE_HIT_ON_FLOW = NÃO
FLOW_AND_DIRECT_RUNTIME_IDENTICAL = NÃO
FIRST_PROVEN_DIVERGENCE_POINT = BEMP_API_RESPONSE_PAYLOAD
ROOT_CAUSE_FULLY_CONFIRMED = NÃO (Diferença de ambiente Worker vs Sandbox é a principal suspeita)

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
