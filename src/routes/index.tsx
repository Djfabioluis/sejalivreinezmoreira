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
Execute esta instrucao no projeto: AUDITORIA SOMENTE LEITURA.

NÃO ALTERE NENHUM ARQUIVO.
NÃO FAÇA DEPLOY.
NÃO FAÇA PUBLISH.
NÃO ALTERE BANCO.

ANTES DE QUALQUER INVESTIGAÇÃO,
QUERO CONFIRMAR QUE ESTE É REALMENTE
O PROJETO BACKEND/API DA BEMP.

Mostre:

PROJECT_NAME =
PROJECT_PURPOSE =
IS_BEMP_BACKEND_PROJECT = SIM/NÃO

Depois procure SOMENTE por referências a:

/api/salons
/services
salonId
unitId

Mostre:

BEMP_SERVICES_ROUTE_FOUND = SIM/NÃO
ROUTE_FILE =
ROUTE_METHOD =
ROUTE_PATTERN =
HANDLER_FUNCTION =

Procure também se este projeto possui
algum código que consulta ou entrega catálogo
de serviços para outras aplicações.

Mostre:

SERVICES_API_IMPLEMENTED_HERE = SIM/NÃO
DATABASE_ACCESS_FOR_SERVICES = SIM/NÃO
EXTERNAL_API_ONLY = SIM/NÃO

Se:

IS_BEMP_BACKEND_PROJECT = NÃO

ou

SERVICES_API_IMPLEMENTED_HERE = NÃO

PARE imediatamente e responda apenas:

WRONG_PROJECT = SIM

NÃO ALTERE NADA.

Se for o projeto correto, responda:

WRONG_PROJECT = NÃO
READY_FOR_SERVER_SIDE_BEMP_AUDIT = SIM

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
