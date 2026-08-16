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
  const diagnostic = `Execute esta instrucao no projeto: FAÇA A PREPARAÇÃO FINAL PARA PRODUÇÃO.

A correção funcional foi validada:

MANICURE_SERVICE_COUNT = 2
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
SAFE_TO_DEPLOY = SIM

BUSINESS_LOGIC_CHANGED = NÃO
BOOKING_LOGIC_CHANGED = NÃO
MATCHING_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO

ANTES DO DEPLOY:

1. REVERTA SOMENTE as alterações de diagnóstico/visualização
   feitas em:

src/routes/index.tsx

2. PRESERVE integralmente:

src/routes/api/public/bemp-services-relay.ts
src/lib/bemp-service.server.ts

3. NÃO altere:
Julia
Gemini
Evolution
Webhook
Booking
Matching
Normalização
UnitId
Preços
List_slots

4. Execute novamente:

BUILD_PASS =
TYPECHECK_PASS =

5. Mostre:

FILES_TO_DEPLOY =
INDEX_TSX_CLEAN =
BEMP_RELAY_PRESERVED =
BEMP_FALLBACK_PRESERVED =
BUSINESS_LOGIC_CHANGED =
SAFE_TO_DEPLOY =

Esperado:

INDEX_TSX_CLEAN = SIM
BEMP_RELAY_PRESERVED = SIM
BEMP_FALLBACK_PRESERVED = SIM
BUSINESS_LOGIC_CHANGED = NÃO
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
SAFE_TO_DEPLOY = SIM

SE TODOS FOREM SIM:

AUTORIZO O DEPLOY/PUBLISH DESTA VERSÃO.

Após publicar, NÃO envie WhatsApp automaticamente.

Faça apenas um teste técnico de produção para:

unitId = 5258

e mostre:

PRODUCTION_PRIMARY_COUNT =
PRODUCTION_FALLBACK_USED =
PRODUCTION_FALLBACK_COUNT =
PRODUCTION_FINAL_COUNT =
PRODUCTION_MANICURE_COUNT =

Se PRODUCTION_MANICURE_COUNT > 0:

READY_FOR_REAL_WHATSAPP_TEST = SIM

PARE.`;

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
