import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900 whitespace-pre-wrap">
Execute esta instrucao no projeto: AUTORIZO SOMENTE A AUDITORIA E A CORREÇÃO DO ROTEAMENTO
DA ROTA /api/public/whatsapp-evolution NO DOMÍNIO DE PRODUÇÃO.

NÃO ALTERE JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK_BASE64.
NÃO ALTERE A URL CONFIGURADA NAS INSTÂNCIAS.
NÃO ALTERE PARSER.
NÃO ALTERE BOOKING LOGIC.
NÃO ALTERE PERSISTÊNCIA.
NÃO ALTERE MAPEAMENTO DAS UNIDADES.

A evidência atual é:

- o endpoint whatsapp-evolution funciona no domínio de deploy;
- o mesmo endpoint retorna 404 no domínio principal configurado na Evolution.

Portanto quero corrigir SOMENTE essa diferença de roteamento.

==================================================
1. MOSTRE AS DUAS URLs EXATAS
==================================================

Mostre:

WORKING_DEPLOY_URL =
WORKING_DEPLOY_WEBHOOK_URL =

CONFIGURED_PRODUCTION_URL =
CONFIGURED_PRODUCTION_WEBHOOK_URL =

Depois:

DEPLOY_DOMAIN_HTTP_STATUS =
PRODUCTION_DOMAIN_HTTP_STATUS =

Não altere nada ainda.

==================================================
2. CLASSIFIQUE O DOMÍNIO DE DEPLOY
==================================================

Responda:

DEPLOY_DOMAIN_IS_STABLE = SIM/NÃO
DEPLOY_DOMAIN_CHANGES_ON_NEW_DEPLOY = SIM/NÃO
DEPLOY_DOMAIN_SUITABLE_FOR_PERMANENT_WEBHOOK = SIM/NÃO

Não proponha trocar a Evolution para esse domínio
sem responder isso.

==================================================
3. IDENTIFIQUE POR QUE O DOMÍNIO PRINCIPAL DÁ 404
==================================================

Audite:

DNS
hosting alias
CDN
reverse proxy
rewrites
serverless routing
SPA fallback
route manifest
custom-domain routing

Mostre:

EXACT_404_CAUSE =

PRODUCTION_DOMAIN_SERVES_FRONTEND = SIM/NÃO
PRODUCTION_DOMAIN_FORWARDS_API_ROUTES = SIM/NÃO
API_ROUTE_PRESENT_IN_DEPLOY_ARTIFACT = SIM/NÃO
API_ROUTE_REACHABLE_VIA_DEPLOY_DOMAIN = SIM/NÃO
API_ROUTE_REACHABLE_VIA_PRIMARY_DOMAIN = SIM/NÃO

==================================================
4. NÃO CONFUNDA EXISTÊNCIA DO HANDLER COM ROTEAMENTO
==================================================

Confirme:

HANDLER_EXISTS = SIM
HANDLER_WORKS_ON_DEPLOY_DOMAIN = SIM

Mas:

PRIMARY_DOMAIN_ROUTING_WORKS = SIM/NÃO

FIRST_FAILURE_POINT =

Esperado neste momento:

PRIMARY_DOMAIN_ROUTING

==================================================
5. REGISTRE A ALTERAÇÃO JÁ FEITA
==================================================

Você informou que removeu um arquivo de teste órfão.

Mostre:

REMOVED_TEST_FILE =
WHY_REMOVED =
RUNTIME_IMPACT = SIM/NÃO
PRODUCTION_BUSINESS_LOGIC_IMPACT = SIM/NÃO

Mostre também:

CURRENT_HEAD =
WORKTREE_DIRTY =
FILES_CHANGED_SINCE_LAST_APPROVED_COMMIT =

Não faça outra limpeza automática.

==================================================
6. CORREÇÃO MÍNIMA
==================================================

Corrija SOMENTE o necessário para que:

POST
https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

alcance o MESMO handler que já funciona no domínio de deploy.

Preferência obrigatória:

MANTER A URL ATUAL DA EVOLUTION.

Não duplique lógica.
Não crie um segundo webhook.
Não mova o atendimento para outro domínio
se o domínio principal puder ser corretamente roteado.

==================================================
7. DIFF OBRIGATÓRIO
==================================================

Antes de publicar, mostre:

arquivo | alteração | classificação

Classificações permitidas:

ROUTING
HOSTING_CONFIG
REWRITE
SERVERLESS_ADAPTER
OBSERVABILITY
TEST_CLEANUP

Obrigatório:

BUSINESS_LOGIC_CHANGED = NÃO
WHATSAPP_HANDLER_CHANGED = NÃO
PARSER_CHANGED = NÃO
GEMINI_CHANGED = NÃO
BEMP_CHANGED = NÃO
EVOLUTION_CONFIG_CHANGED = NÃO

==================================================
8. BUILD
==================================================

Mostre:

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

Se qualquer um for NÃO:

PARE.
NÃO faça nova correção automática.

==================================================
9. PUBLIQUE SOMENTE A CORREÇÃO DE ROTEAMENTO
==================================================

Se e somente se:

BUSINESS_LOGIC_CHANGED = NÃO
BUILD_PASS = SIM
TYPECHECK_PASS = SIM
TESTS_PASS = SIM

autorizo o deploy da correção de roteamento.

Mostre:

DEPLOY_SUCCESS =
DEPLOYED_COMMIT =

==================================================
10. PROVA NÃO DESTRUTIVA
==================================================

Após o deploy, teste a URL PRINCIPAL:

POST
https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

Use somente um payload estruturalmente inválido/seguro
que NÃO execute runAgent.

Objetivo:

provar que não retorna mais 404
e que o handler foi alcançado.

Mostre:

SAFE_PROBE_HTTP_STATUS =
PRODUCTION_WEBHOOK_REACHED =
RUN_AGENT_STARTED =

Obrigatório:

SAFE_PROBE_HTTP_STATUS != 404
PRODUCTION_WEBHOOK_REACHED = SIM
RUN_AGENT_STARTED = NÃO

==================================================
11. NÃO TESTE O WHATSAPP AINDA
==================================================

Depois dessa prova:

NÃO envie mensagem automática.
NÃO reenvie webhook real.
NÃO altere Evolution.

Apenas deixe o monitor ativo.

==================================================
RESULTADO FINAL
==================================================

WORKING_DEPLOY_WEBHOOK_URL =
CONFIGURED_PRODUCTION_WEBHOOK_URL =
EXACT_404_CAUSE =
DEPLOY_DOMAIN_SUITABLE_FOR_PERMANENT_WEBHOOK =
PRIMARY_DOMAIN_ROUTING_WORKS =
REMOVED_TEST_FILE =
RUNTIME_IMPACT_OF_TEST_REMOVAL =
BUSINESS_LOGIC_CHANGED =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
DEPLOY_SUCCESS =
DEPLOYED_COMMIT =
SAFE_PROBE_HTTP_STATUS =
PRODUCTION_WEBHOOK_REACHED =
RUN_AGENT_STARTED =
PRIMARY_DOMAIN_404_RESOLVED =
READY_FOR_REAL_WHATSAPP_TEST =

READY_FOR_REAL_WHATSAPP_TEST só pode ser SIM
se a URL principal configurada na Evolution
não retornar mais 404.

PARE E AGUARDE.
    </div>
  );
}

