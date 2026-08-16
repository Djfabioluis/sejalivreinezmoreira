import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900 whitespace-pre-wrap">
Execute esta instrucao no projeto: PARE. NÃO ALTERE CÓDIGO.
NÃO FAÇA NOVO DEPLOY.
NÃO REENVIE MENSAGEM.
NÃO ALTERE EVOLUTION.
NÃO ALTERE WEBHOOK_BASE64.

A nova instrumentação de PRODUÇÃO confirmou:

ROUTE_FILE =
src/routes/api/public/whatsapp-evolution.ts

PRODUCTION_WEBHOOK_MONITOR_READY = SIM
DEPLOY_SUCCESS = SIM

Após uma NOVA mensagem REAL:

"quero fazer mão hoje"

nenhum evento:

PRODUCTION_WEBHOOK_REACHED

foi registrado.

Portanto está comprovado:

REQUEST_REACHED_HANDLER = NÃO

Mas ainda NÃO está comprovado se:

1. Evolution não tentou entregar;
2. Evolution tentou URL errada;
3. Evolution tentou URL correta mas recebeu erro de rede/HTTP;
4. a URL pública não está roteando até o handler.

Quero SOMENTE diagnóstico de conectividade e roteamento.

==================================================
1. CONFIRME A URL EXATA CONFIGURADA
==================================================

Leia novamente a configuração REAL da Ventura.

Mostre:

EVOLUTION_WEBHOOK_URL =
WEBHOOK_ENABLED =
MESSAGES_UPSERT_SUBSCRIBED =

Esperado:

https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

Não altere.

==================================================
2. CONFIRME A ROTA PUBLICADA
==================================================

Verifique o deployment/manifest/roteamento da versão
ATUALMENTE EM PRODUÇÃO.

Mostre:

PRODUCTION_DOMAIN =
DEPLOYED_COMMIT =
ROUTE_REGISTERED_IN_PRODUCTION =
ROUTE_PUBLIC_PATH =
ROUTE_METHOD =

Obrigatório verificar especificamente:

POST /api/public/whatsapp-evolution

Não deduza apenas pela existência do arquivo fonte.

Quero prova de que a rota está incluída no artefato
realmente publicado.

==================================================
3. TESTE SOMENTE A ACESSIBILIDADE PÚBLICA
==================================================

Sem enviar payload de cliente e sem simular atendimento,
faça uma verificação NÃO DESTRUTIVA da URL pública.

Verifique:

DNS_RESOLVES =
TLS_VALID =
HOST_REACHABLE =
REDIRECT_OCCURRED =
REDIRECT_TARGET =
HTTP_STATUS_FOR_SAFE_PROBE =

Uma resposta 404/405/401 também deve ser mostrada;
não trate como sucesso.

NÃO envie mensagem WhatsApp.
NÃO execute runAgent.

==================================================
4. VERIFIQUE REDIRECT
==================================================

Confirme se:

https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

redireciona para:

/
login
www
ou qualquer outra URL.

Mostre:

REDIRECT_OCCURRED =
FINAL_URL =

Se existir redirect:

WEBHOOK_POST_METHOD_PRESERVED = SIM/NÃO/INDETERMINADO

==================================================
5. VERIFIQUE CAMADA ANTES DO HANDLER
==================================================

Audite somente infraestrutura/roteamento:

CDN
proxy
edge
middleware
WAF
router
authentication middleware

Mostre:

REQUEST_CAN_REACH_ROUTE_WITHOUT_AUTH =
EDGE_BLOCK_PRESENT =
AUTH_MIDDLEWARE_BEFORE_ROUTE =
ROUTE_MATCHING_ERROR =
PROXY_ERROR =

Não altere.

==================================================
6. COMPARE COM OUTRA ROTA PÚBLICA FUNCIONAL
==================================================

Se o projeto possui outro endpoint público que recebe
integrações externas em produção, compare:

rota funcional | método | domínio | status
whatsapp-evolution | método | domínio | status

Mostre:

ROUTING_DIFFERENCE_FOUND =

==================================================
7. VERIFIQUE A EVOLUTION SEM INVENTAR LOG
==================================================

Você já informou:

EVOLUTION_LOG_ACCESS = SIM via API/findMessages
WEBHOOK_DELIVERY_LOG_ACCESS = NÃO

Portanto NÃO diga que houve tentativa de webhook
sem evidência.

Mostre apenas o que é comprovável:

MESSAGE_PRESENT_IN_EVOLUTION =
MESSAGE_ID =
MESSAGE_TIMESTAMP =

WEBHOOK_DELIVERY_ATTEMPT_OBSERVABLE =
SIM/NÃO

Se NÃO houver acesso ao histórico de entrega:

WEBHOOK_DELIVERY_RESULT = INDETERMINADO

==================================================
8. COMPARE AS TRÊS INSTÂNCIAS
==================================================

Mostre somente configuração:

CENTRO_WEBHOOK_URL =
VENTURA_WEBHOOK_URL =
BOULEVARD_WEBHOOK_URL =

ALL_THREE_URLS_IDENTICAL =

Se as três apontarem para a mesma URL, registre isso,
mas não conclua que a URL funciona.

==================================================
9. CLASSIFICAÇÃO FINAL
==================================================

Escolha somente o que estiver comprovado:

[ ] rota não existe no deployment de produção
[ ] domínio não resolve
[ ] falha TLS
[ ] redirect incompatível
[ ] rota retorna 404
[ ] rota retorna 401/403
[ ] rota retorna 5xx
[ ] bloqueio de edge/proxy/middleware
[ ] URL configurada na Evolution diferente da rota publicada
[ ] Evolution não tentou entrega — COMPROVADO
[ ] tentativa da Evolution não é observável
[ ] infraestrutura pública parece correta, entrega Evolution permanece não comprovada
[ ] outro

FIRST_PROVEN_FAILURE_POINT =

ROOT_CAUSE_CONFIRMED = SIM/NÃO

==================================================
RESULTADO FINAL
==================================================

EVOLUTION_WEBHOOK_URL =
ROUTE_REGISTERED_IN_PRODUCTION =
ROUTE_PUBLIC_PATH =
DNS_RESOLVES =
TLS_VALID =
HOST_REACHABLE =
REDIRECT_OCCURRED =
FINAL_URL =
EDGE_BLOCK_PRESENT =
MESSAGE_PRESENT_IN_EVOLUTION =
WEBHOOK_DELIVERY_ATTEMPT_OBSERVABLE =
WEBHOOK_DELIVERY_RESULT =
REQUEST_REACHED_HANDLER = NÃO
FIRST_PROVEN_FAILURE_POINT =
ROOT_CAUSE_CONFIRMED =

NÃO CORRIJA NADA.

RESPONDA NO CHAT.
NÃO ATUALIZE O DASHBOARD.
PARE.
    </div>
  );
}

