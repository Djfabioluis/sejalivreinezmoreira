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
NÃO FAÇA NOVO PUBLISH.
NÃO ALTERE EVOLUTION.
NÃO ENVIE WHATSAPP.

O subdomínio publicado foi corrigido para:

https://sejalivreinezmoreira.lovable.app

Agora execute SOMENTE uma prova não destrutiva em:

POST
https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

Use payload inválido/seguro que NÃO execute runAgent.

Mostre:

SAFE_PROBE_EXECUTED =
HTTP_STATUS =
FINAL_URL =
REDIRECT_OCCURRED =
ROUTE_REACHED =
PRODUCTION_WEBHOOK_REACHED_LOG =
RUN_AGENT_STARTED =
PRIMARY_DOMAIN_404_RESOLVED =

Critério:

HTTP_STATUS não pode ser 404.

Esperado:

ROUTE_REACHED = SIM
PRODUCTION_WEBHOOK_REACHED_LOG = SIM
RUN_AGENT_STARTED = NÃO
PRIMARY_DOMAIN_404_RESOLVED = SIM

NÃO CORRIJA NADA.
RESPONDA SOMENTE COM O RESULTADO DO TESTE.
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
