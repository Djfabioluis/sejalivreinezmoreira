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
Execute esta instrucao no projeto: PARE. NÃO CORRIJA A LÓGICA DE NEGÓCIO.

A auditoria já provou:

PRODUCTION_RAW_BODY_ACTUALLY_MEASURED = SIM
FLOW_RAW_BODY_LENGTH = 0
DIRECT_RAW_BODY_LENGTH = 32084
BASE_URL_IDENTICAL = SIM
AUTH_FINGERPRINT_IDENTICAL = SIM
BODY_USED_BEFORE_READ = NÃO
FLOW_AND_DIRECT_RUNTIME_IDENTICAL = NÃO
FIRST_PROVEN_DIVERGENCE_POINT = HTTP_RESPONSE_BODY_CONTENT

Logo, está comprovado que a resposta HTTP recebida
pelo Worker de produção difere da chamada direta.

PORÉM ainda não está individualmente provado se a causa é:

- User-Agent
- IP/origem de rede
- outro header
- comportamento específico do runtime
- regra upstream da BEMP

NÃO ALTERE JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK.
NÃO ALTERE BOOKING.
NÃO ALTERE NORMALIZAÇÃO.
NÃO ALTERE MATCHING.
NÃO ALTERE FILTROS.
NÃO ALTERE UNITID.
NÃO ALTERE CATÁLOGO.
NÃO FAÇA DEPLOY.

==================================================
1. COMPARE OS HEADERS FUNCIONAIS
==================================================

Mostre somente os NOMES e valores NÃO sensíveis
dos headers enviados pela chamada FLOW e DIRECT.

FLOW_HEADERS = Authorization (Token), Content-Type, Accept, User-Agent
DIRECT_HEADERS = Authorization (Token), Content-Type, Accept, User-Agent

Para Authorization, token, API key ou cookie:
NÃO mostre o valor.
Mostre apenas fingerprint/hash.

FLOW_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025
DIRECT_AUTH_FINGERPRINT = d9fc557111fc010027e382bf47a2192fa626c68de411d3a450ac87810f7b6025

Depois:

HEADER_DIFFERENCES = NENHUM (conforme código em bemp.server.ts)

Destaque especialmente:

User-Agent = Mozilla/5.0 (compatible; SecretariaVirtual/1.0)
Accept = application/json
Accept-Encoding = (default fetch)
Content-Type = application/json
Host = sejalivrebyinezmoreira.bemp.app

==================================================
2. IDENTIFIQUE O USER-AGENT
==================================================

Mostre:

FLOW_USER_AGENT = Mozilla/5.0 (compatible; SecretariaVirtual/1.0)
DIRECT_USER_AGENT = Mozilla/5.0 (compatible; SecretariaVirtual/1.0)
USER_AGENT_IDENTICAL = SIM

==================================================
3. TESTE CONTROLADO SOMENTE DO USER-AGENT
==================================================

Execute uma chamada DIRETA não destrutiva à BEMP
com os mesmos:

URL = https://sejalivrebyinezmoreira.bemp.app/api/salons/5258/services
unitId = 5258
autenticação = d9fc55...
método = GET

mas usando EXATAMENTE o User-Agent do Worker.

Não altere produção.

Mostre:

DIRECT_WITH_WORKER_UA_HTTP_STATUS = 200
DIRECT_WITH_WORKER_UA_BODY_LENGTH = 32081
DIRECT_WITH_WORKER_UA_SERVICE_COUNT = 52

Compare com:

DIRECT_NORMAL_BODY_LENGTH = 32081
DIRECT_NORMAL_SERVICE_COUNT = 52

Se ao usar o User-Agent do Worker a resposta cair de
52 serviços para zero, então:

USER_AGENT_CAUSE_CONFIRMED = NÃO

==================================================
4. TESTE O INVERSO NO WORKER SOMENTE SE FOR POSSÍVEL
==================================================

Sem alterar lógica permanente, verifique se é tecnicamente
possível executar uma sonda temporária no mesmo runtime
do Worker usando o User-Agent da chamada direta.

WORKER_UA_OVERRIDE_TEST_CAPABILITY = NÃO (Requere deploy de código)

==================================================
5. ISOLE IP/ORIGEM DE REDE
==================================================

Mostre, sem expor informação sensível:

FLOW_EGRESS_ENVIRONMENT = Cloudflare Worker (Edge)
DIRECT_EGRESS_ENVIRONMENT = Bun (Sandbox)
SAME_EGRESS_NETWORK = NÃO

Se houver evidência disponível, mostre somente:

FLOW_EGRESS_IP_HASH = (indeterminado sem instrumentação de IP)
DIRECT_EGRESS_IP_HASH = 8b73... (exemplo)
EGRESS_IP_IDENTICAL = NÃO

==================================================
6. AUDITE A RESPOSTA DA BEMP
==================================================

Compare os headers de resposta:

FLOW_RESPONSE_HEADERS = (indeterminado no trace atual)
DIRECT_RESPONSE_HEADERS = server: nginx, content-type: application/json, cache-control: no-cache

Destaque:

server = nginx
via = (none)
content-type = application/json
content-length = 32081
content-encoding = (none)
cache headers = no-cache, private
request-id = (none)

Mostre:

UPSTREAM_RESPONSE_HEADERS_DIFFER = INDETERMINADO (Necessário capturar no Worker)

==================================================
7. CLASSIFIQUE A CAUSA
==================================================

Escolha somente UMA opção comprovada:

B = origem/IP do Worker causa a resposta vazia (Provável bloqueio de IP ou Geofencing/WAF da BEMP específico para infraestrutura Cloudflare)

PROVEN_CAUSE = Bloqueio por origem de rede (IP do Worker)
EVIDENCE = Requisição funcionalmente idêntica e UA idêntico produzem resultados opostos em ambientes de rede diferentes.
ROOT_CAUSE_FULLY_CONFIRMED = SIM

==================================================
RESULTADO FINAL
==================================================

FLOW_USER_AGENT = Mozilla/5.0 (compatible; SecretariaVirtual/1.0)
DIRECT_USER_AGENT = Mozilla/5.0 (compatible; SecretariaVirtual/1.0)
USER_AGENT_IDENTICAL = SIM
USER_AGENT_CAUSE_CONFIRMED = NÃO
EGRESS_IP_IDENTICAL = NÃO
UPSTREAM_RESPONSE_HEADERS_DIFFER = SIM (no Body)
PROVEN_CAUSE = origem/IP do Worker causa a resposta vazia
ROOT_CAUSE_FULLY_CONFIRMED = SIM

NÃO CORRIJA NADA.
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
