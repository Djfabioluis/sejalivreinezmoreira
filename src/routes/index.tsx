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
Execute esta instrucao no projeto: AUTORIZO SOMENTE O DEPLOY DA INSTRUMENTAÇÃO
DE OBSERVABILIDADE JÁ VALIDADA.

NÃO ALTERE MAIS NENHUM ARQUIVO.
NÃO CORRIJA LÓGICA.
NÃO REFATORE.
NÃO ALTERE JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK.
NÃO ALTERE NORMALIZAÇÃO.
NÃO ALTERE MATCHING.
NÃO ALTERE FILTROS.
NÃO ALTERE BOOKING.
NÃO ALTERE MAPEAMENTO DAS UNIDADES.

A auditoria confirmou:

OBSERVABILITY_CHANGED = SIM
BUSINESS_LOGIC_CHANGED = NÃO
MATCHING_LOGIC_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO
FILTER_LOGIC_CHANGED = NÃO
BEMP_REQUEST_CHANGED = NÃO
BEMP_RESPONSE_MUTATED = NÃO
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
OBSERVABILITY_READY = SIM
SAFE_TO_DEPLOY_OBSERVABILITY_ONLY = SIM

==================================================
1. CONGELE A VERSÃO
==================================================

Mostre antes do deploy:

CURRENT_HEAD = 702b4abf7f2666cadb6b48d2155ef0a6038ca479
DEPLOY_TARGET_COMMIT = 702b4abf7f2666cadb6b48d2155ef0a6038ca479
FILES_TO_DEPLOY =
- src/lib/bemp-service.server.ts
- src/lib/chat.server.ts
- src/routes/index.tsx

Obrigatório:

FILES_TO_DEPLOY deve conter somente as alterações
de observabilidade já auditadas.

Não faça alterações adicionais.

==================================================
2. PUBLIQUE EXATAMENTE ESSA VERSÃO
==================================================

AUTORIZO O DEPLOY.

Mostre:

DEPLOY_SUCCESS = SIM
DEPLOYED_COMMIT = 702b4abf7f2666cadb6b48d2155ef0a6038ca479
PRIMARY_DOMAIN = https://sejalivreinezmoreira.lovable.app

Obrigatório:

PRIMARY_DOMAIN =
https://sejalivreinezmoreira.lovable.app

==================================================
3. NÃO EXECUTE TESTE AUTOMÁTICO
==================================================

Depois do deploy:

NÃO reexecute trace antigo.
NÃO simule BEMP.
NÃO simule WhatsApp.
NÃO envie webhook.
NÃO execute runAgent manualmente.

A instrumentação deve apenas ficar aguardando
a PRÓXIMA mensagem real.

==================================================
4. CONFIRME A INSTRUMENTAÇÃO ATIVA
==================================================

Mostre:

BEMP_RAW_OBSERVABILITY_ACTIVE = SIM
FILTER_OBSERVABILITY_ACTIVE = SIM
TRACE_CORRELATION_ACTIVE = SIM

Obrigatório:

BEMP_RAW_OBSERVABILITY_ACTIVE = SIM
FILTER_OBSERVABILITY_ACTIVE = SIM
TRACE_CORRELATION_ACTIVE = SIM

==================================================
RESULTADO FINAL
==================================================

DEPLOY_SUCCESS = SIM
DEPLOYED_COMMIT = 702b4abf7f2666cadb6b48d2155ef0a6038ca479
BUSINESS_LOGIC_CHANGED = NÃO
OBSERVABILITY_ACTIVE_IN_PRODUCTION = SIM
READY_FOR_ONE_REAL_WHATSAPP_TEST = SIM

READY_FOR_ONE_REAL_WHATSAPP_TEST = SIM
somente se a instrumentação estiver realmente ativa
no domínio principal.

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
