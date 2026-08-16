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
Execute esta instrucao no projeto: AUTORIZO SOMENTE O PUBLISH DO ESTADO ATUAL JÁ VALIDADO.

NÃO ALTERE MAIS NENHUM ARQUIVO.
NÃO FAÇA CORREÇÃO.
NÃO REFATORE.
NÃO ALTERE JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK_BASE64.
NÃO ALTERE A URL DAS INSTÂNCIAS.
NÃO ALTERE PARSER.
NÃO ALTERE PERSISTÊNCIA.
NÃO ALTERE bookingContext.
NÃO ALTERE MAPEAMENTO DAS UNIDADES.
NÃO ALTERE list_services.
NÃO ALTERE list_slots.

A auditoria atual confirmou:

- lógica Julia/BEMP/Gemini preservada;
- Build = PASS;
- Typecheck = PASS;
- endpoint whatsapp-evolution funcional no domínio de deploy;
- 404 causado pelo domínio principal não estar servindo
  o estado atual do projeto.

==================================================
1. CONGELE O ESTADO EXATO ANTES DO PUBLISH
==================================================

Mostre:

CURRENT_HEAD =
PUBLISH_TARGET_COMMIT =

RUNTIME_FILES_CHANGED_SINCE_APPROVED_LOGIC =
UI_ONLY_FILES_CHANGED =

Mostre explicitamente:

src/routes/index.tsx = UI / RUNTIME

Obrigatório:

RUNTIME_FILES_CHANGED_SINCE_APPROVED_LOGIC = NENHUM

Se houver qualquer arquivo de runtime alterado:

PARE.
NÃO PUBLIQUE.

==================================================
2. CONFIRME NOVAMENTE
==================================================

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

BUSINESS_LOGIC_CHANGED = NÃO
WHATSAPP_HANDLER_CHANGED = NÃO
PARSER_CHANGED = NÃO
EVOLUTION_CONFIG_CHANGED = NÃO
BEMP_CHANGED = NÃO
GEMINI_CHANGED = NÃO

Se qualquer condição acima não for atendida:

PARE.

==================================================
3. PUBLIQUE EXATAMENTE O ESTADO VALIDADO
==================================================

AUTORIZO O PUBLISH.

Não faça alteração durante a publicação.

Mostre depois:

PUBLISH_SUCCESS =
PUBLISHED_COMMIT =
PRIMARY_DOMAIN =

Obrigatório:

PUBLISHED_COMMIT = PUBLISH_TARGET_COMMIT

==================================================
4. TESTE SOMENTE A ROTA
==================================================

Depois do Publish, NÃO envie WhatsApp ainda.

Faça uma verificação não destrutiva em:

POST
https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

Use somente payload inválido/seguro que não possa
iniciar atendimento.

Mostre:

HTTP_STATUS =
ROUTE_REACHED =
PRODUCTION_WEBHOOK_REACHED_LOG =
RUN_AGENT_STARTED =

Critério obrigatório:

HTTP_STATUS != 404
ROUTE_REACHED = SIM
PRODUCTION_WEBHOOK_REACHED_LOG = SIM
RUN_AGENT_STARTED = NÃO

==================================================
5. SE CONTINUAR 404
==================================================

NÃO CORRIJA AUTOMATICAMENTE.

Mostre:

PRIMARY_DOMAIN_404_RESOLVED = NÃO
PUBLISHED_COMMIT =
DEPLOY_DOMAIN_STATUS =
PRIMARY_DOMAIN_STATUS =

E PARE.

==================================================
6. SE O 404 SUMIR
==================================================

Mostre:

PRIMARY_DOMAIN_404_RESOLVED = SIM
WEBHOOK_ROUTE_ACTIVE_IN_PRODUCTION = SIM
READY_FOR_REAL_WHATSAPP_TEST = SIM

NÃO envie mensagem automática.
NÃO teste a Julia.
NÃO altere mais nada.

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
