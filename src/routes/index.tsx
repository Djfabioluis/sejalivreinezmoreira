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

NÃO ALTERE CÓDIGO.
NÃO FAÇA DEPLOY.
NÃO ALTERE EVOLUTION.
NÃO SIMULE NADA.
NÃO ENVIE RESPOSTA MANUAL.

A rota de produção já foi validada:

PRIMARY_DOMAIN_404_RESOLVED = SIM
ROUTE_REACHED = SIM

Agora leia SOMENTE os logs REAIS desse novo atendimento.

UNIDADE:
VENTURA

unitId esperado:
5258

==================================================
1. ENTRADA REAL
==================================================

Mostre:

MESSAGE_EVENT_RECEIVED =
REQUEST_TIMESTAMP =
REQUEST_ID =
TRACE_ID =
EVENT_TYPE =
INSTANCE_NAME =
UNIT_ID_RESOLVED =
MESSAGE_EXTRACTED =

==================================================
2. INTERPRETAÇÃO
==================================================

Mostre:

SERVICE_INTENT =
MAO_NORMALIZADA_MANICURE =
DATE_INTENT =
HOJE_PRESERVADO =

Esperado:

SERVICE_INTENT = MANICURE
MAO_NORMALIZADA_MANICURE = SIM
HOJE_PRESERVADO = SIM

==================================================
3. CATÁLOGO BEMP
==================================================

Mostre:

LIST_SERVICES_CALLED =
BEMP_RESPONSE_RECEIVED =
BEMP_RAW_COUNT =
FILTERED_CANDIDATES =

Liste SOMENTE nomes e IDs reais retornados pela BEMP.

Não invente serviços.

==================================================
4. RESPOSTA DA JULIA
==================================================

Mostre:

RUN_AGENT_STARTED =
MODEL_CALL_STARTED =
MODEL_CALL_SUCCESS =
RESPONSE_GENERATED =
OUTPUT_VALIDATED =
OUTBOUND_ATTEMPTED =
OUTBOUND_SUCCESS =

Mostre também o texto exato enviado ao WhatsApp.

==================================================
5. CRITÉRIOS DO TESTE
==================================================

A Julia NÃO deve:

- perguntar se "mão" significa manicure;
- perguntar novamente a data;
- inventar serviços;
- usar serviços de outra unidade.

Se houver mais de um serviço real compatível,
ela pode apresentar SOMENTE os candidatos reais da BEMP.

==================================================
RESULTADO FINAL
==================================================

MESSAGE_EVENT_RECEIVED =
UNIT_ID_RESOLVED =
MAO_NORMALIZADA_MANICURE =
HOJE_PRESERVADO =
LIST_SERVICES_CALLED =
BEMP_RESPONSE_RECEIVED =
RUN_AGENT_STARTED =
MODEL_CALL_SUCCESS =
OUTPUT_VALIDATED =
OUTBOUND_SUCCESS =
FIRST_FAILURE_POINT =
ROOT_CAUSE_CONFIRMED =

NÃO CORRIJA NADA.

PARE APÓS MOSTRAR OS LOGS REAIS.
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
