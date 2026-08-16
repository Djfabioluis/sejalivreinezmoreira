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
Execute esta instrucao no projeto: AUTORIZO SOMENTE A IMPLEMENTAÇÃO DA INSTRUMENTAÇÃO
DE OBSERVABILIDADE JÁ LOCALIZADA.

NÃO ALTERE O COMPORTAMENTO.

PONTOS CONFIRMADOS:

BEMP_CALL_FILE =
src/lib/bemp-service.server.ts

BEMP_CALL_FUNCTION =
BempService.listServices

RAW_RESPONSE_CAPTURE_POINT =
src/lib/bemp-service.server.ts:65

FIRST_FILTER_POINT =
src/lib/chat.server.ts:364

FINAL_CANDIDATES_POINT =
src/lib/chat.server.ts:373

==================================================
1. INSTRUMENTE A RESPOSTA BEMP ANTES DO FILTRO
==================================================

Imediatamente após:

await this.fetch(...)

e depois de desserializar a resposta,
ANTES de qualquer filtro, registre somente:

BEMP_RAW_RESPONSE_RECEIVED = SIM
BEMP_HTTP_STATUS =
BEMP_RAW_COUNT =

Para cada serviço:

serviceId
name
price
active/status, se existir

NÃO registre:

Authorization
API keys
cookies
headers secretos
tokens
dados pessoais

==================================================
2. NÃO ALTERE A RESPOSTA
==================================================

A variável original retornada pela BEMP deve continuar
exatamente igual.

Obrigatório:

BEMP_RESPONSE_MUTATED_BY_LOGGER = NÃO
BEMP_REQUEST_CHANGED = NÃO
BEMP_RESPONSE_TRANSFORMED = NÃO

A instrumentação deve somente observar.

==================================================
3. INSTRUMENTE O FILTRO EM chat.server.ts
==================================================

No ponto:

src/lib/chat.server.ts:364

registre ANTES do filtro:

SERVICE_SEARCH_TERM =
NORMALIZED_SERVICE_SEARCH =
FILTER_INPUT_COUNT =

Depois registre as etapas reais existentes no código.

Não invente etapas que não existam.

Mostre:

AFTER_FILTER_COUNT =

Se atualmente existem múltiplas condições dentro de
services.filter, registre o resultado individual de cada
condição, sem mudar sua lógica.

==================================================
4. RASTREIE ESPECIFICAMENTE MANICURE
==================================================

Para cada serviço cujo nome REAL contenha
case-insensitive:

manicure
manicuri
mão
mao

registre:

SERVICE_ID =
SERVICE_NAME =
RAW_SERVICE_NAME =
NORMALIZED_SERVICE_NAME =
SEARCH_TERM =

ACTIVE_CONDITION_RESULT =
UNIT_CONDITION_RESULT =
NAME_CONDITION_RESULT =
FINAL_MATCH_RESULT =

Se alguma dessas condições não existir no código atual,
mostre:

CONDITION_NOT_PRESENT

Não crie uma nova condição.

==================================================
5. PONTO FINAL
==================================================

Em:

src/lib/chat.server.ts:373

registre:

FINAL_CANDIDATES_COUNT =

Para cada candidato final:

serviceId
name
price

==================================================
6. CORRELAÇÃO
==================================================

Todos os logs adicionados devem conter, quando disponível:

traceId
unitId

para permitir correlacionar a resposta BEMP,
o filtro e a resposta final da mesma mensagem.

Não altere fluxo para criar trace novo.

==================================================
7. GARANTIAS OBRIGATÓRIAS
==================================================

Depois da implementação, confirme:

MATCHING_LOGIC_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO
FILTER_LOGIC_CHANGED = NÃO
BEMP_REQUEST_CHANGED = NÃO
BEMP_RESPONSE_MUTATED = NÃO
JULIA_BEHAVIOR_CHANGED = NÃO
BUSINESS_LOGIC_CHANGED = NÃO

Somente:

OBSERVABILITY_CHANGED = SIM

==================================================
8. MOSTRE O DIFF
==================================================

Liste todos os arquivos alterados:

arquivo | linhas/função | alteração | classificação

Classificação permitida:

OBSERVABILITY_ONLY

Se aparecer qualquer alteração classificada como:

BUSINESS_LOGIC
MATCHING
NORMALIZATION
FILTER
BEMP_REQUEST
JULIA

PARE.

==================================================
9. VALIDAÇÃO
==================================================

Execute:

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

Se qualquer um for NÃO:

PARE.
NÃO CORRIJA AUTOMATICAMENTE.

==================================================
10. NÃO FAÇA DEPLOY
==================================================

Mesmo se tudo passar:

NÃO PUBLIQUE.
NÃO FAÇA DEPLOY.
NÃO ENVIE WHATSAPP.
NÃO EXECUTE TESTE REAL.

Mostre:

OBSERVABILITY_READY =
SAFE_TO_DEPLOY_OBSERVABILITY_ONLY =

==================================================
RESULTADO FINAL
==================================================

FILES_CHANGED =
OBSERVABILITY_CHANGED =
BUSINESS_LOGIC_CHANGED =
MATCHING_LOGIC_CHANGED =
NORMALIZATION_CHANGED =
FILTER_LOGIC_CHANGED =
BEMP_REQUEST_CHANGED =
BEMP_RESPONSE_MUTATED =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
OBSERVABILITY_READY =
SAFE_TO_DEPLOY_OBSERVABILITY_ONLY =

PARE E AGUARDE MINHA AUTORIZAÇÃO.
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
