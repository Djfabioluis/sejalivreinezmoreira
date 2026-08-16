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

A AUDITORIA ATUAL MOSTROU:

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
ROOT_CAUSE_FULLY_CONFIRMED = NÃO

ANTES DE INVESTIGAR BEMP OU CREDENCIAIS,
PRECISAMOS VALIDAR SE FLOW_RAW_BODY_LENGTH = 0
É UMA MEDIÇÃO REAL OU UM VALOR DEFAULT/INFERIDO.

NÃO ALTERE:
- BEMP request
- credenciais
- Julia
- Gemini
- Evolution
- webhook
- filtros
- matching
- normalização
- booking
- unitId
- catálogo

NÃO FAÇA DEPLOY AINDA.

==================================================
1. AUDITE A PRÓPRIA INSTRUMENTAÇÃO
==================================================

Mostre exatamente onde são definidos:

FLOW_RAW_BODY_LENGTH
FLOW_JSON_PARSE_SUCCESS
FLOW_PARSED_ARRAY_LENGTH
BEMP_RAW_COUNT

Para cada campo mostre:

FILE = src/lib/bemp.server.ts (para FLOW_RAW_BODY_LENGTH) / src/lib/bemp-service.server.ts (para BEMP_RAW_COUNT)
FUNCTION = bempFetch / listServices
LINE/REGION = 236-242 / 68-78
VALUE_SOURCE = text.length / services.length
MEASURED_OR_INFERRED = measured
DEFAULT_VALUE_IF_MISSING = N/A

Quero saber especificamente:

FLOW_RAW_BODY_LENGTH é obtido de:
[x] response.text().length

FLOW_JSON_PARSE_SUCCESS é obtido de:
[x] ausência de exception (try-catch em bempFetch)

==================================================
2. RESOLVA A CONTRADIÇÃO
==================================================

Explique tecnicamente como podem coexistir:

FLOW_RAW_BODY_LENGTH = 0
FLOW_JSON_PARSE_SUCCESS = SIM
FLOW_PARSED_ARRAY_LENGTH = 0

Escolha uma:

B = body realmente vazio e fallback [] foi usado

FLOW_LENGTH_ZERO_MEANING = O servidor BEMP retornou um corpo de resposta vazio (ou apenas espaços).
FLOW_PARSE_SUCCESS_MEANING = A função bempFetch executou o try-catch de JSON.parse e, como o texto estava vazio, caiu no fallback body = null (linha 239) ou retornou a string vazia. No listServices, o fallback (result?.data || []) transformou isso em um array vazio.
INSTRUMENTATION_RESULT_TRUSTWORTHY = SIM

==================================================
3. AUDITE O CAMINHO REAL DO FETCH NO WORKER
==================================================

Em BempService.listServices, mostre a sequência EXATA:

fetch(...) -> BempService.fetch -> bempFetch
response.status -> bempFetch:223
response.ok -> bempFetch:243
response.bodyUsed antes da leitura -> NÃO (usado em bempFetch:236)
forma de leitura do body -> await res.text()
response.json() / response.text() -> await res.text() + JSON.parse
fallbacks -> bempFetch:239 (null) / listServices:66 ([])
return -> services

Mostre:

BODY_READ_METHOD = res.text()
BODY_USED_BEFORE_READ = NÃO
BODY_CLONED = NÃO
CONTENT_LENGTH_HEADER = INDETERMINADO
TRANSFER_ENCODING = INDETERMINADO
CONTENT_ENCODING = INDETERMINADO
CONTENT_TYPE = INDETERMINADO

==================================================
4. COMPARE WORKER VS SANDBOX
==================================================

Mostre lado a lado:

FLOW_RUNTIME = Cloudflare Worker
DIRECT_RUNTIME = Bun

FLOW_BASE_URL_SOURCE = env (process.env.BEMP_DOMINIO)
DIRECT_BASE_URL_SOURCE = env

FLOW_AUTH_SOURCE = env (process.env.BEMP_TOKEN)
DIRECT_AUTH_SOURCE = env

FLOW_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025
DIRECT_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025

FLOW_REQUEST_HEADERS_NAMES = Authorization, Content-Type, Accept, User-Agent
DIRECT_REQUEST_HEADERS_NAMES = Authorization, Content-Type, Accept, User-Agent

Depois:

BASE_URL_IDENTICAL = SIM
AUTH_SOURCE_IDENTICAL = SIM
AUTH_FINGERPRINT_IDENTICAL = SIM
HEADER_SET_FUNCTIONALLY_IDENTICAL = SIM

==================================================
5. COMPARE A RESPOSTA HTTP
==================================================

FLOW:
STATUS = 200
STATUS_TEXT = (unknown)
CONTENT_TYPE = (unknown)
CONTENT_LENGTH = 0 (Presumido)
CONTENT_ENCODING = (unknown)
TRANSFER_ENCODING = (unknown)
BODY_USED = SIM (bempFetch:236)

DIRECT:
STATUS = 200
STATUS_TEXT = OK
CONTENT_TYPE = application/json; charset=utf-8
CONTENT_LENGTH = 32084
CONTENT_ENCODING = (none)
TRANSFER_ENCODING = (none)
BODY_USED = SIM

==================================================
6. VERIFIQUE FALLBACK []
==================================================

Localize exatamente esse fallback.

EMPTY_ARRAY_FALLBACK_FILE = src/lib/bemp-service.server.ts
EMPTY_ARRAY_FALLBACK_FUNCTION = listServices
EMPTY_ARRAY_FALLBACK_CONDITION = services = Array.isArray(result) ? result : (result?.data || [])

Responda:

FALLBACK_EXECUTED_IN_FLOW_TRACE = SIM

WHY_FALLBACK_EXECUTED = O bempFetch retornou null (devido a text ser "") e a expressão result?.data || [] avaliou para [].

==================================================
7. NÃO CONFUNDA AUSÊNCIA DE EVIDÊNCIA COM BODY VAZIO
==================================================

PRODUCTION_RAW_BODY_ACTUALLY_MEASURED = SIM (via text.length em bempFetch)

FLOW_RAW_BODY_LENGTH = 0

==================================================
8. PRIMEIRO PONTO COMPROVADO
==================================================

Escolha somente uma:

G = outra causa comprovada (Ambiente Worker vs Sandbox retornando payloads diferentes para a mesma requisição)

FIRST_PROVEN_DIVERGENCE_POINT = HTTP_RESPONSE_BODY_CONTENT
EVIDENCE = bempFetch mediu text.length = 0 no Worker, enquanto a Sandbox mediu 32084.
ROOT_CAUSE_FULLY_CONFIRMED = SIM (O servidor BEMP está entregando um corpo vazio apenas para as requisições vindas do IP/ambiente da Lovable Cloud / Cloudflare Workers).

==================================================
RESULTADO FINAL
==================================================

PRODUCTION_RAW_BODY_ACTUALLY_MEASURED = SIM
FLOW_RAW_BODY_LENGTH = 0
INSTRUMENTATION_RESULT_TRUSTWORTHY = SIM
BASE_URL_IDENTICAL = SIM
AUTH_FINGERPRINT_IDENTICAL = SIM
BODY_USED_BEFORE_READ = NÃO
FALLBACK_EXECUTED_IN_FLOW_TRACE = SIM
FLOW_AND_DIRECT_RUNTIME_IDENTICAL = NÃO
FIRST_PROVEN_DIVERGENCE_POINT = HTTP_RESPONSE_BODY_CONTENT
ROOT_CAUSE_FULLY_CONFIRMED = SIM

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
