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

O TRACE REAL:

webhook-1786918557115

confirmou:

BEMP_HTTP_STATUS = 200
BEMP_RAW_COUNT = 0
SERVICE_SEARCH_TERM = manicure
NORMALIZED_SERVICE_SEARCH = manicure
FINAL_CANDIDATES_COUNT = 0
FIRST_CANDIDATE_LOSS_POINT = BEMP_API_RESPONSE

Portanto o filtro posterior NÃO é a causa.

AGORA QUERO DESCOBRIR POR QUE A CAMADA BEMP
ENTREGOU ZERO SERVIÇOS PARA A UNIDADE 5258.

NÃO ALTERE:
- Julia
- Gemini
- Evolution
- webhook
- booking
- normalização
- matching
- filtros
- unitId
- preços
- catálogo

NÃO FAÇA DEPLOY.
NÃO ENVIE WHATSAPP.

==================================================
1. AUDITE A REQUISIÇÃO EXATA À BEMP
==================================================

Para o trace:

webhook-1786918557115

mostre:

BEMP_REQUEST_URL =
BEMP_HTTP_METHOD =
UNIT_ID_SENT =
BEMP_QUERY_PARAMETERS =
BEMP_HTTP_STATUS =
BEMP_CONTENT_TYPE =
BEMP_RESPONSE_BODY_LENGTH =

Não mostre token, Authorization ou credenciais.

Confirme:

UNIT_ID_SENT = 5258

==================================================
2. AUDITE A ESTRUTURA BRUTA DA RESPOSTA
==================================================

Não mostre dados sensíveis.

Quero saber o FORMATO real do JSON recebido.

Mostre:

RAW_BODY_IS_EMPTY =
RAW_JSON_TYPE = array/object/null/string
RAW_TOP_LEVEL_KEYS =

Se for array:

RAW_TOP_LEVEL_ARRAY_LENGTH =

Se for object, mostre as chaves existentes e,
para cada chave que contenha array:

KEY =
ARRAY_LENGTH =

Exemplos apenas para inspeção:

data
services
items
results
content

NÃO presuma que esses nomes existem.

Use somente as chaves reais encontradas.

==================================================
3. COMPARE COM O PARSER DE BempService.listServices
==================================================

Arquivo:

src/lib/bemp-service.server.ts

Função:

BempService.listServices

Mostre exatamente:

EXPECTED_RESPONSE_SHAPE =
ACTUAL_RESPONSE_SHAPE =

Depois:

PARSER_READS_FIELD =
ACTUAL_SERVICES_FIELD =

Mostre:

RESPONSE_SCHEMA_MATCH = SIM/NÃO

Não altere código.

==================================================
4. DISTINGA OS DOIS CENÁRIOS
==================================================

Precisamos escolher somente um:

A)
A BEMP realmente devolveu uma coleção vazia.

B)
A BEMP devolveu serviços, mas BempService.listServices
está lendo o campo/estrutura errada.

Mostre:

BEMP_SERVER_RETURNED_ZERO_SERVICES = SIM/NÃO
SERVICES_EXIST_ELSEWHERE_IN_RESPONSE = SIM/NÃO
BEMP_ADAPTER_SCHEMA_MISMATCH = SIM/NÃO

==================================================
5. FAÇA UMA CONSULTA DIRETA NÃO DESTRUTIVA
==================================================

Faça UMA consulta GET à mesma API da BEMP,
para a mesma unidade 5258,
usando exatamente a mesma autenticação/configuração
da aplicação.

Não altere cadastro.

Mostre:

DIRECT_BEMP_HTTP_STATUS =
DIRECT_BEMP_RESPONSE_TYPE =
DIRECT_BEMP_SERVICE_COUNT =

Se houver serviços, liste somente:

serviceId
name
price

Não mostre credenciais.

==================================================
6. COMPARE CHAMADA DO FLUXO VS CHAMADA DIRETA
==================================================

Mostre:

FLOW_ENDPOINT =
DIRECT_ENDPOINT =
ENDPOINTS_IDENTICAL =

FLOW_UNIT_ID =
DIRECT_UNIT_ID =
UNIT_IDS_IDENTICAL =

FLOW_RESPONSE_COUNT =
DIRECT_RESPONSE_COUNT =

FLOW_AND_DIRECT_RESULTS_MATCH = SIM/NÃO

==================================================
7. CONCLUSÃO FORENSE
==================================================

Escolha exatamente uma:

[ ] catálogo BEMP da unidade 5258 realmente retornou vazio
[ ] parser/adaptador BEMP está lendo estrutura errada
[ ] endpoint BEMP utilizado está incorreto
[ ] unitId enviado está incorreto
[ ] autenticação/permissão produz resposta vazia
[ ] outra causa comprovada
[ ] ainda não há evidência suficiente

Mostre:

ULTIMATE_ROOT_CAUSE =
EVIDENCE =
ROOT_CAUSE_FULLY_CONFIRMED = SIM/NÃO

NÃO CORRIJA NADA.

PARE APÓS A AUDITORIA.
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
