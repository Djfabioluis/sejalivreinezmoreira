import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900 whitespace-pre-wrap">Execute esta instrucao no projeto: PARE. NÃO ALTERE NADA.

A configuração real da Ventura agora mostra:

WEBHOOK_ENABLED = true

WEBHOOK_URL =
https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

WEBHOOK_EVENTS =
["MESSAGES_UPSERT", "CONNECTION_UPDATE"]

WEBHOOK_BASE64 = true

Portanto:

MESSAGES_UPSERT ESTÁ CONFIGURADO.

A classificação anterior:

FIRST_FAILURE_POINT =
EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT

NÃO ESTÁ SUFICIENTEMENTE COMPROVADA.

Não quero mais análise baseada somente em configuração.

Quero agora PROVA DA ENTREGA REAL DO EVENTO.

==================================================
1. LOCALIZE A MENSAGEM REAL NA EVOLUTION
==================================================

Instância:

agente-5541998803684

Mensagem:

"quero fazer mão hoje"

Janela aproximada:

17:35 UTC até 17:45 UTC

Mostre:

MESSAGE_FOUND_IN_EVOLUTION =
MESSAGE_ID =
MESSAGE_TIMESTAMP =
MESSAGE_EVENT_TYPE =
FROM_ME =
INSTANCE_NAME =

Obrigatório:

MESSAGE_FOUND_IN_EVOLUTION = SIM

==================================================
2. EVENTO MESSAGES_UPSERT
==================================================

Para esse MESSAGE_ID específico:

MESSAGES_UPSERT_OBJECT_CREATED =
MESSAGES_UPSERT_EMITTED =

Não deduza pela configuração.

Mostre evidência do log real da Evolution.

==================================================
3. TENTATIVA REAL DE WEBHOOK
==================================================

Para o mesmo MESSAGE_ID:

WEBHOOK_DELIVERY_ATTEMPTED =
WEBHOOK_TARGET_URL =
WEBHOOK_METHOD =
WEBHOOK_TIMESTAMP =
WEBHOOK_HTTP_STATUS =
WEBHOOK_RESPONSE_BODY =
WEBHOOK_ERROR =
WEBHOOK_RETRY_COUNT =

Esta é a informação principal que quero.

Se WEBHOOK_DELIVERY_ATTEMPTED = NÃO:

mostre o motivo técnico exato.

==================================================
4. NÃO CONFUNDA EVENTO COM ENTREGA
==================================================

Separe:

MESSAGE_RECEIVED_BY_EVOLUTION =
MESSAGES_UPSERT_EMITTED =
WEBHOOK_DELIVERY_ATTEMPTED =
WEBHOOK_DELIVERY_SUCCESS =

São quatro etapas diferentes.

==================================================
5. AUDITE WEBHOOK_BASE64
==================================================

A configuração mostra:

WEBHOOK_BASE64 = true

Sem alterar nada, verifique o endpoint:

/api/public/whatsapp-evolution

Mostre:

ENDPOINT_EXPECTS_BASE64 = SIM/NÃO
ENDPOINT_EXPECTS_JSON = SIM/NÃO

PAYLOAD_RECEIVED_FORMAT_EXPECTED =

E compare com:

EVOLUTION_PAYLOAD_FORMAT_SENT =

Depois:

BASE64_CONFIGURATION_COMPATIBLE_WITH_ENDPOINT = SIM/NÃO

Não mude esse campo ainda.

==================================================
6. PROCURE A REQUEST EM PRODUÇÃO
==================================================

Nos logs do ambiente de PRODUÇÃO, para o mesmo timestamp
e MESSAGE_ID:

PRODUCTION_REQUEST_FOUND =
REQUEST_TIMESTAMP =
REQUEST_PATH =
REQUEST_METHOD =
REQUEST_ID =
HTTP_STATUS =

Obrigatório pesquisar especificamente:

/api/public/whatsapp-evolution

==================================================
7. SE A REQUEST CHEGOU
==================================================

Mostre a sequência:

WEBHOOK_HANDLER_ENTERED =
PAYLOAD_DECODED =
PAYLOAD_PARSED =
EVENT_TYPE_DETECTED =
INSTANCE_RESOLVED =
UNIT_ID_RESOLVED =
MESSAGE_EXTRACTED =
MESSAGE_FILTERED =
RUN_AGENT_STARTED =

Se algum campo for NÃO:

FIRST_FAILURE_POINT = exatamente essa etapa.

==================================================
8. SE NÃO CHEGOU À PRODUÇÃO
==================================================

Se:

WEBHOOK_DELIVERY_ATTEMPTED = SIM

e

PRODUCTION_REQUEST_FOUND = NÃO

investigue somente:

DNS
TLS
redirect
timeout
network
URL incorreta

Mostre:

DELIVERY_NETWORK_ERROR =
REDIRECT_OCCURRED =
TLS_ERROR =
TIMEOUT =
DNS_ERROR =

==================================================
9. SE O HTTP STATUS NÃO FOR 2XX
==================================================

Se a Evolution recebeu:

400
401
403
404
405
422
500
502
503

mostre:

STATUS =
RESPONSE_BODY =
ERROR_SOURCE =

Não corrija.

==================================================
10. COMPARE COM UMA MENSAGEM QUE FUNCIONOU
==================================================

Se existir uma mensagem anterior da Ventura que
foi processada pela Julia corretamente, compare:

MENSAGEM FUNCIONAL:
event type =
webhook URL =
base64 =
HTTP status =
request path =

MENSAGEM ATUAL:
event type =
webhook URL =
base64 =
HTTP status =
request path =

DIFFERENCE_FOUND =

==================================================
RESULTADO FINAL
==================================================

MESSAGE_FOUND_IN_EVOLUTION =
MESSAGES_UPSERT_OBJECT_CREATED =
MESSAGES_UPSERT_EMITTED =
WEBHOOK_DELIVERY_ATTEMPTED =
WEBHOOK_TARGET_URL =
WEBHOOK_HTTP_STATUS =
WEBHOOK_DELIVERY_SUCCESS =
WEBHOOK_BASE64 =
BASE64_CONFIGURATION_COMPATIBLE_WITH_ENDPOINT =
PRODUCTION_REQUEST_FOUND =
WEBHOOK_HANDLER_ENTERED =
MESSAGE_EXTRACTED =
RUN_AGENT_STARTED =
FIRST_FAILURE_POINT =
ROOT_CAUSE =
SAFE_TO_FIX =

NÃO ALTERE CÓDIGO.
NÃO ALTERE EVOLUTION.
NÃO REENVIE A MENSAGEM.
NÃO FAÇA DEPLOY.

PARE E AGUARDE MINHA AUTORIZAÇÃO.</h1>
      </div>
    </div>
  );
}
