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
Execute esta instrucao no projeto: ACABEI DE ENVIAR UMA ÚNICA MENSAGEM REAL NO WHATSAPP
DA UNIDADE VENTURA:

"quero fazer mão hoje"

A INSTRUMENTAÇÃO DE OBSERVABILIDADE JÁ ESTÁ EM PRODUÇÃO.

NÃO ALTERE CÓDIGO.
NÃO FAÇA DEPLOY.
NÃO SIMULE.
NÃO REEXECUTE TRACE ANTIGO.
NÃO ENVIE MENSAGEM.
NÃO CORRIJA NADA.

LEIA SOMENTE O TRACE NOVO GERADO POR ESSA MENSAGEM REAL.

Quero os valores capturados pela nova instrumentação.

==================================================
1. IDENTIFIQUE O NOVO TRACE
==================================================

Mostre:

TRACE_ID =
REQUEST_TIMESTAMP =
UNIT_ID =
MESSAGE_TEXT =

Obrigatório:

UNIT_ID = 5258

==================================================
2. RETORNO BEMP ANTES DE QUALQUER FILTRO
==================================================

Mostre:

BEMP_RAW_RESPONSE_RECEIVED =
BEMP_HTTP_STATUS =
BEMP_RAW_COUNT =

Liste TODOS os serviços registrados pela instrumentação:

serviceId =
name =
price =
active/status =

Não use dados de execução anterior.

==================================================
3. MANICURE NO RAW
==================================================

Mostre:

RAW_CONTAINS_MANICURE =
RAW_MANICURE_MATCHES =

Para cada serviço de manicure:

SERVICE_ID =
SERVICE_NAME =
PRICE =

==================================================
4. BUSCA UTILIZADA
==================================================

Mostre:

SERVICE_SEARCH_TERM =
NORMALIZED_SERVICE_SEARCH =
FILTER_INPUT_COUNT =

==================================================
5. TRAJETÓRIA DOS FILTROS
==================================================

Mostre as contagens REAIS registradas:

BEMP_RAW_COUNT =
AFTER_ACTIVE_FILTER_COUNT =
AFTER_UNIT_FILTER_COUNT =
AFTER_NAME_FILTER_COUNT =
FINAL_CANDIDATES_COUNT =

Se o código não possuir alguma dessas etapas separadamente,
mostre:

CONDITION_NOT_PRESENT

Não invente uma etapa.

==================================================
6. TRAJETÓRIA DE CADA SERVIÇO MANICURE
==================================================

Para cada serviço de manicure recebido da BEMP:

SERVICE_ID =
SERVICE_NAME =
RAW_SERVICE_NAME =
NORMALIZED_SERVICE_NAME =
SEARCH_TERM =

ACTIVE_CONDITION_RESULT =
UNIT_CONDITION_RESULT =
NAME_CONDITION_RESULT =
FINAL_MATCH_RESULT =

Se removido:

REMOVED_BY_FILTER =
FILTER_INPUT_VALUE =
NORMALIZED_VALUE =
SEARCH_VALUE =

==================================================
7. RESULTADO ENVIADO À JULIA
==================================================

Mostre:

FINAL_CANDIDATES_COUNT =

Para cada candidato final:

serviceId =
name =
price =

Depois:

RUN_AGENT_STARTED =
RESPONSE_GENERATED =
OUTPUT_VALIDATED =
OUTBOUND_SUCCESS =
TEXT_SENT_TO_WHATSAPP =

==================================================
8. DEFINA A CAUSA SOMENTE COM A NOVA EVIDÊNCIA
==================================================

Escolha exatamente uma:

A = BEMP retornou zero serviços
B = BEMP retornou serviços, mas nenhum de manicure
C = manicure veio da BEMP e foi removido por filtro ACTIVE
D = manicure veio da BEMP e foi removido por filtro UNIT
E = manicure veio da BEMP e foi removido por filtro NAME
F = manicure chegou aos candidatos finais
G = outra causa comprovada

Mostre:

PROVEN_SCENARIO =
FIRST_CANDIDATE_LOSS_POINT =
ROOT_CAUSE_CONFIRMED =

Se os logs novos não estiverem presentes:

OBSERVABILITY_CAPTURED_THIS_TRACE = NÃO
ROOT_CAUSE_CONFIRMED = NÃO

e PARE.

==================================================
RESULTADO FINAL
==================================================

TRACE_ID =
BEMP_HTTP_STATUS =
BEMP_RAW_COUNT =
RAW_CONTAINS_MANICURE =
RAW_MANICURE_MATCHES =
SERVICE_SEARCH_TERM =
NORMALIZED_SERVICE_SEARCH =
AFTER_ACTIVE_FILTER_COUNT =
AFTER_UNIT_FILTER_COUNT =
AFTER_NAME_FILTER_COUNT =
FINAL_CANDIDATES_COUNT =
PROVEN_SCENARIO =
FIRST_CANDIDATE_LOSS_POINT =
ROOT_CAUSE_CONFIRMED =

NÃO CORRIJA NADA.
PARE APÓS MOSTRAR A EVIDÊNCIA.
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
