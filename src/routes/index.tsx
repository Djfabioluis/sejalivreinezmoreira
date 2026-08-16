import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900 whitespace-pre-wrap">
Execute esta instrucao no projeto: AUTORIZO A CORREÇÃO EXCLUSIVAMENTE DO ERRO 404
DA ROTA PÚBLICA DO WEBHOOK.

NÃO ALTERE A JULIA.
NÃO ALTERE GEMINI.
NÃO ALTERE BEMP.
NÃO ALTERE bookingContext.
NÃO ALTERE persistência.
NÃO ALTERE list_services.
NÃO ALTERE list_slots.
NÃO ALTERE unitId.
NÃO ALTERE mapeamento das unidades.
NÃO ALTERE preços.
NÃO ALTERE Evolution.
NÃO ALTERE WEBHOOK_BASE64.
NÃO ALTERE a URL configurada nas três instâncias.

CAUSA CONFIRMADA:

WEBHOOK URL configurada:

https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

ROTA ESPERADA:

POST /api/public/whatsapp-evolution

RESULTADO EM PRODUÇÃO:

404

FIRST_PROVEN_FAILURE_POINT =
PRODUCTION_ROUTE_NOT_REGISTERED_OR_NOT_ROUTED

==================================================
1. DESCUBRA POR QUE O ARQUIVO EXISTE MAS A ROTA DÁ 404
==================================================

Existe o arquivo:

src/routes/api/public/whatsapp-evolution.ts

Mas a URL pública retorna 404.

Antes de alterar, identifique:

ROUTE_FILE_EXISTS =
ROUTE_EXPORTED =
ROUTE_INCLUDED_IN_BUILD =
ROUTE_REGISTERED_IN_SERVER_RUNTIME =
ROUTE_INCLUDED_IN_DEPLOY_ARTIFACT =
PRODUCTION_ROUTER_RECOGNIZES_ROUTE =

Mostre:

EXACT_REASON_FOR_404 =

Possibilidades:

- arquivo não cria endpoint server-side nesse framework
- rota não registrada
- rota fora da convenção do runtime
- build não inclui server handler
- deploy está servindo somente SPA/frontend
- rewrite/proxy incorreto
- outro

Não adivinhe.

==================================================
2. VERIFIQUE A ARQUITETURA CORRETA DO PROJETO
==================================================

Identifique qual mecanismo ESTE projeto utiliza
para endpoints backend públicos em produção.

Mostre:

BACKEND_RUNTIME =
SERVER_ROUTE_CONVENTION =
EXISTING_WORKING_SERVER_ENDPOINTS =

Se existir outra rota API funcional no projeto,
mostre como ela é registrada.

Compare:

ROTA FUNCIONAL
vs
/api/public/whatsapp-evolution

Mostre:

ROUTING_DIFFERENCE =

==================================================
3. CORREÇÃO MÍNIMA
==================================================

Corrija SOMENTE o roteamento para que:

POST
/api/public/whatsapp-evolution

execute o handler já existente.

PREFERÊNCIA:

manter EXATAMENTE a URL atualmente configurada
na Evolution.

NÃO mova lógica de negócio.
NÃO reescreva o handler.
NÃO altere parser.
NÃO altere payload.
NÃO crie novo fluxo de WhatsApp.

Se for necessário criar um adaptador serverless,
ele deve apenas encaminhar a request para a lógica
já existente.

==================================================
4. PRESERVE O HANDLER
==================================================

Confirme após a alteração:

WHATSAPP_HANDLER_LOGIC_CHANGED = NÃO
PARSER_CHANGED = NÃO
BUSINESS_LOGIC_CHANGED = NÃO
GEMINI_CHANGED = NÃO
BEMP_CHANGED = NÃO
PERSISTENCE_CHANGED = NÃO
UNIT_MAPPING_CHANGED = NÃO
EVOLUTION_CONFIG_CHANGED = NÃO

Somente:

PRODUCTION_ROUTING_CHANGED = SIM

==================================================
5. AUDITE O DIFF
==================================================

Mostre todos os arquivos alterados:

arquivo | tipo | motivo

Classifique cada alteração como:

ROUTING
SERVERLESS
DEPLOY_CONFIG
OBSERVABILITY
RUNTIME_BUSINESS_LOGIC

Obrigatório:

RUNTIME_BUSINESS_LOGIC_CHANGED = NÃO

==================================================
6. BUILD
==================================================

Execute:

BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =

Se qualquer um for NÃO:

PARE.
NÃO faça correção adicional automática.

==================================================
7. TESTE A EXISTÊNCIA DA ROTA ANTES DO WHATSAPP
==================================================

Após publicar a correção de roteamento,
faça uma prova NÃO DESTRUTIVA.

Objetivo:

comprovar que a rota deixou de retornar 404.

Não envie webhook de cliente válido.
Não execute runAgent.

Se a rota aceita somente POST,
envie um POST estruturalmente inválido/incompleto
que obrigatoriamente seja rejeitado ANTES do runAgent.

Por exemplo, payload vazio ou evento inválido,
somente se isso for seguro pelo código existente.

Mostre:

SAFE_ROUTE_PROBE_SENT =
HTTP_STATUS =

Critério:

HTTP_STATUS != 404

É aceitável receber, conforme o handler:

400
405
422
ou outro status controlado

desde que seja PROVA de que o handler/rota foi alcançado.

Mostre:

PRODUCTION_WEBHOOK_REACHED_LOG_CREATED =
RUN_AGENT_STARTED_DURING_PROBE =

Obrigatório:

PRODUCTION_WEBHOOK_REACHED_LOG_CREATED = SIM
RUN_AGENT_STARTED_DURING_PROBE = NÃO

==================================================
8. PROVE O DEPLOY
==================================================

Mostre:

DEPLOY_SUCCESS =
DEPLOYED_COMMIT =
PRODUCTION_ROUTE_AVAILABLE =

Depois:

POST_ROUTE_404_RESOLVED = SIM/NÃO

Obrigatório:

POST_ROUTE_404_RESOLVED = SIM

==================================================
9. NÃO TESTE WHATSAPP AINDA
==================================================

Depois de resolver o 404:

NÃO envie mensagem automática.
NÃO simule cliente.
NÃO altere Evolution.
NÃO altere as três instâncias.

Apenas deixe o monitor de produção ativo.

==================================================
RESULTADO FINAL
==================================================

EXACT_REASON_FOR_404 =
BACKEND_RUNTIME =
ROUTING_DIFFERENCE =
PRODUCTION_ROUTING_CHANGED =
BUSINESS_LOGIC_CHANGED =
PARSER_CHANGED =
BUILD_PASS =
TYPECHECK_PASS =
TESTS_PASS =
DEPLOY_SUCCESS =
DEPLOYED_COMMIT =
PRODUCTION_ROUTE_AVAILABLE =
SAFE_ROUTE_PROBE_STATUS =
PRODUCTION_WEBHOOK_REACHED_LOG_CREATED =
RUN_AGENT_STARTED_DURING_PROBE =
POST_ROUTE_404_RESOLVED =
READY_FOR_REAL_WHATSAPP_TEST =

Só marque:

READY_FOR_REAL_WHATSAPP_TEST = SIM

se a rota de produção NÃO retornar mais 404.

PARE E AGUARDE MINHA AUTORIZAÇÃO.
    </div>
  );
}

