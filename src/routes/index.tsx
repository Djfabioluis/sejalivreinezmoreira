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

NÃO ALTERE CÓDIGO.
NÃO FAÇA DEPLOY.
NÃO FAÇA PUBLISH.
NÃO ALTERE BANCO.

Quero confirmar se ESTE é realmente o backend/API da BEMP
que atende o Bem Agenda AI.

Procure no projeto por:

/api/salons
/services
salonId
unitId
serviceId

e por código que implemente uma API HTTP de serviços.

Mostre:

PROJECT_NAME =
PROJECT_PURPOSE =

BEMP_BACKEND_IMPLEMENTED_HERE = SIM/NÃO
SERVICES_ROUTE_IMPLEMENTED_HERE = SIM/NÃO
DATABASE_SERVICES_ACCESS_EXISTS = SIM/NÃO

Se encontrou a rota, mostre:

ROUTE_FILE =
ROUTE_METHOD =
ROUTE_PATTERN =
HANDLER_FUNCTION =
SERVICE_LAYER =
DATABASE_LAYER =

Depois:

CORRECT_BEMP_BACKEND_PROJECT = SIM/NÃO

Se NÃO:
PARE.
NÃO ALTERE NADA.

Se SIM:
READY_FOR_BEMP_SERVER_SIDE_AUDIT = SIM

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
