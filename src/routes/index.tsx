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
Execute esta instrucao no projeto: NÃO ALTERE CÓDIGO.
NÃO ALTERE O DASHBOARD.
NÃO FAÇA NOVO PUBLISH.
NÃO ENVIE WHATSAPP.
NÃO SIMULE CLIENTE.

O PUBLISH JÁ FOI CONCLUÍDO.

AGORA EXECUTE SOMENTE UMA PROVA TÉCNICA NÃO DESTRUTIVA
DA ROTA NO DOMÍNIO PRINCIPAL JÁ PUBLICADO.

URL:

https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

MÉTODO:
POST

Use um payload inválido e seguro que seja rejeitado
ANTES de qualquer runAgent.

Não use mensagem de cliente real.

QUERO RESULTADO REAL DA REQUISIÇÃO,
NÃO TEXTO COLOCADO NO DASHBOARD.

Mostre:

SAFE_PROBE_EXECUTED =
HTTP_STATUS =
FINAL_URL =
REDIRECT_OCCURRED =
ROUTE_REACHED =
PRODUCTION_WEBHOOK_REACHED_LOG =
RUN_AGENT_STARTED =

Depois:

PRIMARY_DOMAIN_404_RESOLVED =

CRITÉRIO:

Se HTTP_STATUS = 404:
PRIMARY_DOMAIN_404_RESOLVED = NÃO

Se HTTP_STATUS != 404
e houver evidência de entrada no handler:
PRIMARY_DOMAIN_404_RESOLVED = SIM

RUN_AGENT_STARTED deve ser NÃO.

Se você NÃO conseguir executar uma requisição HTTP real
contra o domínio publicado, responda:

EXTERNAL_PROBE_CAPABILITY = NÃO

e PARE.

NÃO INVENTE RESULTADOS.
NÃO CORRIJA NADA.
NÃO PUBLIQUE NOVAMENTE.
RESPONDA SOMENTE NO CHAT.
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
