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
Execute esta instrucao no projeto: AUTORIZO SOMENTE INSTRUMENTAÇÃO TEMPORÁRIA DE AUDITORIA
DO RETORNO DA BEMP.

NÃO CORRIJA A LÓGICA.
NÃO ALTERE JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK.
NÃO ALTERE NORMALIZAÇÃO.
NÃO ALTERE MATCHING.
NÃO ALTERE FILTROS.
NÃO ALTERE bookingContext.
NÃO ALTERE list_services.
NÃO ALTERE list_slots.
NÃO ALTERE MAPEAMENTO DE UNIDADES.

A auditoria atual confirmou:

ROOT_CAUSE_CONFIRMED = NÃO

Porque o trace atual registra apenas o resultado final
do lookup/filter, mas NÃO registra os candidatos recebidos
da BEMP antes da filtragem.

Quero adicionar SOMENTE observabilidade sanitizada.

==================================================
1. LOCALIZE O PONTO EXATO
==================================================

Identifique no código:

- função que chama a BEMP para listar serviços;
- linha imediatamente após a resposta HTTP;
- linha antes do primeiro filtro;
- cada etapa posterior de filtragem.

Mostre:

BEMP_CALL_FILE =
BEMP_CALL_FUNCTION =
RAW_RESPONSE_CAPTURE_POINT =
FIRST_FILTER_POINT =
FINAL_CANDIDATES_POINT =

NÃO altere ainda.

==================================================
2. ADICIONE LOG SANITIZADO DO RETORNO BEMP
==================================================

Imediatamente após receber e desserializar a resposta da BEMP,
ANTES de qualquer filtro, registre:

BEMP_RAW_RESPONSE_RECEIVED = SIM
BEMP_HTTP_STATUS =
BEMP_RAW_COUNT =

Para cada serviço registre SOMENTE:

serviceId
name
price
active/status, se existir

NÃO grave:

token
authorization
headers secretos
cookies
dados pessoais
credenciais

NÃO preciso do JSON inteiro se houver outros campos.
Quero somente os campos necessários para auditar o catálogo.

==================================================
3. REGISTRE A TRAJETÓRIA DOS FILTROS
==================================================

Na MESMA execução registre:

SERVICE_SEARCH_TERM =
NORMALIZED_SERVICE_SEARCH =

BEMP_RAW_COUNT =
AFTER_ACTIVE_FILTER_COUNT =
AFTER_UNIT_FILTER_COUNT =
AFTER_NAME_FILTER_COUNT =
FINAL_CANDIDATES_COUNT =

Para cada serviço cujo nome contenha "manicure"
(case-insensitive), registre:

SERVICE_ID =
SERVICE_NAME =
PASSED_ACTIVE_FILTER =
PASSED_UNIT_FILTER =
PASSED_NAME_FILTER =

Se algum filtro remover o item:

REMOVED_BY_FILTER =
FILTER_INPUT_VALUE =
NORMALIZED_VALUE =
SEARCH_VALUE =

==================================================
4. NÃO MODIFIQUE DECISÕES
==================================================

A instrumentação deve observar o comportamento atual.

Obrigatório:

MATCHING_LOGIC_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO
FILTER_LOGIC_CHANGED = NÃO
BEMP_REQUEST_CHANGED = NÃO
JULIA_BEHAVIOR_CHANGED = NÃO
BUSINESS_LOGIC_CHANGED = NÃO

==================================================
5. AUDITE O DIFF
==================================================

Mostre:

arquivo | função | alteração | impacto

Toda alteração deve ser classificada como:

OBSERVABILITY_ONLY

Obrigatório:

RUNTIME_BEHAVIOR_CHANGED = NÃO

==================================================
6. VALIDAÇÃO
==================================================

Execute:

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

Se qualquer resultado for NÃO:

PARE.
NÃO tente corrigir automaticamente.

==================================================
7. PREPARE PARA DEPLOY
==================================================

Se tudo passar, mostre:

OBSERVABILITY_READY = SIM
SAFE_TO_DEPLOY_OBSERVABILITY_ONLY = SIM/NÃO

NÃO FAÇA DEPLOY AINDA.

PARE E AGUARDE MINHA AUTORIZAÇÃO.

==================================================
RESULTADO FINAL
==================================================

BEMP_CALL_FILE =
BEMP_CALL_FUNCTION =
RAW_RESPONSE_CAPTURE_POINT =
FILTER_STAGES_INSTRUMENTED =
BUSINESS_LOGIC_CHANGED =
RUNTIME_BEHAVIOR_CHANGED =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
OBSERVABILITY_READY =
SAFE_TO_DEPLOY_OBSERVABILITY_ONLY =
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
