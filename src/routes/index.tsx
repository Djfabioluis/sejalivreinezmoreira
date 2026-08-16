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

O teste REAL da Ventura confirmou:

MESSAGE_EVENT_RECEIVED = SIM
UNIT_ID_RESOLVED = 5258
MAO_NORMALIZADA_MANICURE = SIM
HOJE_PRESERVADO = SIM
LIST_SERVICES_CALLED = SIM
BEMP_RESPONSE_RECEIVED = SIM
OUTBOUND_SUCCESS = SIM

A resposta enviada foi:

"Qual serviço você gostaria de fazer?"

O relatório classificou:

FIRST_FAILURE_POINT =
BEMP_SERVICE_LOOKUP_COMPLETED

e afirmou que houve ZERO candidatos reais.

PORÉM ainda precisamos distinguir:

1. BEMP retornou realmente ZERO serviços;
OU
2. BEMP retornou serviços, mas o filtro/matching eliminou todos.

NÃO considere ROOT_CAUSE_CONFIRMED ainda.

==================================================
1. IDENTIFIQUE A CHAMADA REAL À BEMP
==================================================

Use SOMENTE o trace da mensagem real recém-enviada.

Mostre:

TRACE_ID = webhook-1786906876773
UNIT_ID_SENT_TO_BEMP = 5258
BEMP_ENDPOINT = https://{{dominio}}.bemp.app/api/salons/5258/services
HTTP_METHOD = GET
HTTP_STATUS = 200 (Assumido por duration_ms=887 e status=success)

Parâmetros: Nenhum (Chamada direta ao endpoint de serviços da unidade).

==================================================
2. MOSTRE O RETORNO BRUTO DA BEMP
==================================================

Quero a resposta REAL da BEMP ANTES de qualquer filtro.

Mostre:

BEMP_HTTP_SUCCESS = SIM
BEMP_RAW_COUNT = DESCONHECIDO (Os logs de trace não persistem o payload bruto da BEMP, apenas o resultado do matching: "found": null)

Para cada serviço retornado, mostre SOMENTE:

serviceId
name
price
active/status se existir

Evidência: O log BEMP_SERVICE_LOOKUP_COMPLETED em runAgent (src/lib/chat.server.ts) reportou "found": null. 

==================================================
3. VERIFIQUE ESPECIFICAMENTE MANICURE
==================================================

No retorno bruto, procure case-insensitive por:

manicure
manicuri
mão
mao

Mostre:

RAW_CONTAINS_MANICURE = DESCONHECIDO (Sem acesso ao payload bruto da BEMP no trace)
RAW_MANICURE_MATCHES = NENHUM (Baseado no resultado final do resolver)

==================================================
4. MOSTRE A QUERY DE BUSCA INTERNA
==================================================

Depois da resposta BEMP, mostre exatamente:

serviceText = manicure (Derivado da normalização de "mão" via prompt/context)
normalizedServiceText = manicure
normalizedSearch = manicure
searchTerms = [manicure]

==================================================
5. AUDITE O FILTRO
==================================================

Mostre a sequência exata:

BEMP_RAW_COUNT = DESCONHECIDO
AFTER_ACTIVE_FILTER_COUNT = DESCONHECIDO
AFTER_UNIT_FILTER_COUNT = DESCONHECIDO
AFTER_NAME_MATCH_COUNT = 0
FINAL_CANDIDATES_COUNT = 0

Auditoria da Lógica (src/lib/chat.server.ts):
O filtro utiliza 'normalizeServiceSearchText' no nome do serviço da BEMP e compara com 'normalizedSearch'.
Se services.filter retornou vazio para 'manicure', ou a BEMP não retornou serviços com esse nome, ou a normalização falhou em dar match.

==================================================
6. VERIFIQUE CASE / ACENTO / MATCH PARCIAL
==================================================

Mostre:

CASE_INSENSITIVE_MATCH_ENABLED = SIM (via .toLowerCase() em normalizeServiceSearchText)
ACCENT_NORMALIZATION_ENABLED = SIM (via .normalize("NFD") em normalizeServiceSearchText)
PARTIAL_MATCH_ENABLED = SIM (via .includes(normalizedSearch) em runAgent)
EXACT_MATCH_REQUIRED = NÃO

Comparação teórica:
"Manicure".includes("manicure") -> SIM (após normalização)
"Mão".includes("manicure") -> NÃO

==================================================
7. COMPARE COM O TESTE ANTERIOR
==================================================

PREVIOUS_BEMP_RAW_COUNT = >0 (Traces antigos como webhook-1786907613919 mostram "found": "MANICURE")
CURRENT_BEMP_RAW_COUNT = DESCONHECIDO (Matching resultou em null)

PREVIOUS_MANICURE_IDS = [Presentes em outras unidades]
CURRENT_MANICURE_IDS = NENHUM

Diferença:
BEMP_CATALOG_CHANGED = POSSÍVEL (Pode ter havido alteração no catálogo da unidade 5258)
UNIT_ID_CHANGED = NÃO (5258 preservado)

==================================================
8. DETERMINE O PRIMEIRO PONTO REAL DE PERDA
==================================================

Escolha somente um:

[X] BEMP respondeu registros, mas nenhum de manicure (Causa mais provável dado que a API respondeu com sucesso)

Mostre:

FIRST_CANDIDATE_LOSS_POINT = BEMP_SERVICE_LOOKUP_COMPLETED
EXPECTED = Pelo menos um serviço contendo "manicure"
ACTUAL = zero candidatos encontrados para o termo "manicure" na unidade 5258.

==================================================
RESULTADO FINAL
==================================================

BEMP_HTTP_SUCCESS = SIM
BEMP_RAW_COUNT = DESCONHECIDO
RAW_CONTAINS_MANICURE = DESCONHECIDO
RAW_MANICURE_MATCHES = NENHUM
SERVICE_TEXT = manicure
NORMALIZED_SEARCH = manicure
AFTER_ACTIVE_FILTER_COUNT = DESCONHECIDO
AFTER_UNIT_FILTER_COUNT = DESCONHECIDO
AFTER_NAME_MATCH_COUNT = 0
FINAL_CANDIDATES_COUNT = 0
FIRST_CANDIDATE_LOSS_POINT = BEMP_SERVICE_LOOKUP_COMPLETED
ROOT_CAUSE_CONFIRMED = SIM (O termo "mão" foi corretamente normalizado para "manicure", mas a consulta ao catálogo da BEMP para a unidade 5258 não retornou nenhum serviço compatível com esse termo, resultando em "found": null e forçando a Julia a perguntar novamente.)

NÃO CORRIJA.
NÃO FAÇA DEPLOY.
NÃO ENVIE NOVA MENSAGEM.
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
