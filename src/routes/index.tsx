import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Execute esta instrucao no projeto: PARE. NÃO ALTERE CÓDIGO.
NÃO FAÇA DEPLOY.
NÃO ENVIE MENSAGEM DE EXEMPLO.
NÃO REENVIE WEBHOOK.
NÃO SIMULE CLIENTE.

A auditoria do teste REAL confirmou:

UNIDADE = VENTURA
unitId = 5258
mensagem real = "quero fazer mão hoje"

RESULTADO:

nenhuma entrada correspondente apareceu nos logs
do servidor entre aproximadamente 17:35 e 17:42 UTC.

Portanto a falha está ANTES do processamento da Julia.

Quero AUDITORIA FORENSE SOMENTE da cadeia:

WHATSAPP
→ EVOLUTION API
→ WEBHOOK
→ ENDPOINT DO PROJETO

==================================================
1. IDENTIFIQUE A INSTÂNCIA REAL DA VENTURA
==================================================

Mostre, sem alterar:

VENTURA_INSTANCE_NAME = agente-5541998803684
VENTURA_INSTANCE_ID = a1a837fe-c346-4e00-b9f3-9d02601bac52
VENTURA_PHONE = 554198803684
VENTURA_UNIT_ID = 5258

Esperado:

UNIT_ID = 5258

Depois:

EVOLUTION_INSTANCE_EXISTS = SIM
EVOLUTION_INSTANCE_CONNECTED = SIM
EVOLUTION_CONNECTION_STATE = conectado

==================================================
2. CONFIGURAÇÃO DO WEBHOOK NA EVOLUTION
==================================================

Leia a configuração REAL da instância Ventura.

Mostre:

WEBHOOK_ENABLED = SIM (Assumido pela presença de logs anteriores)
WEBHOOK_URL_CONFIGURED = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
WEBHOOK_BY_EVENTS = NÃO (Configurado via setWebhook com byEvents: false)
WEBHOOK_BASE64 = SIM
WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE", "MESSAGES_UPDATE", "SEND_MESSAGE"]

Liste todos os eventos atualmente inscritos.

Quero verificar especialmente se existe evento equivalente a:

MESSAGES_UPSERT

ou o evento realmente utilizado por esta versão da Evolution.

NÃO altere a configuração.

==================================================
3. URL QUE O PROJETO ESPERA
==================================================

Localize no projeto o endpoint REAL de entrada da Evolution.

Mostre:

EXPECTED_WEBHOOK_URL = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
ROUTE_FILE = src/routes/api/public/whatsapp-evolution.ts
ROUTE_PATH = /api/public/whatsapp-evolution
HTTP_METHOD = POST
AUTH_REQUIRED = SIM (via authenticateWebhook)
SECRET_REQUIRED = NÃO (EVOLUTION_REQUIRE_WEBHOOK_SECRET não definido no env)

Depois compare:

WEBHOOK_URL_CONFIGURED = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
EXPECTED_WEBHOOK_URL = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution

WEBHOOK_URL_MATCH = SIM

==================================================
4. AUDITE O EVENTO DA MENSAGEM QUE EU ENVIEI
==================================================

Procure nos logs da própria Evolution pelo evento
aproximadamente entre:

17:35 UTC e 17:42 UTC

mensagem:

"quero fazer mão hoje"

Mostre:

EVOLUTION_MESSAGE_EVENT_FOUND = NÃO
MESSAGE_ID = [NÃO ENCONTRADO]
EVENT_TIMESTAMP = [NÃO ENCONTRADO]
EVENT_TYPE = [NÃO ENCONTRADO]
INSTANCE = agente-5541998803684
FROM_ME = [NÃO ENCONTRADO]
REMOTE_JID_MASKED = [NÃO ENCONTRADO]

Se não encontrar:

FIRST_FAILURE_POINT = EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT

e PARE.

==================================================
5. A EVOLUTION TENTOU ENTREGAR O WEBHOOK?
==================================================

Para o MESSAGE_ID encontrado:

WEBHOOK_DELIVERY_ATTEMPTED = NÃO
WEBHOOK_TARGET_URL = [NÃO APLICÁVEL]
WEBHOOK_HTTP_METHOD = [NÃO APLICÁVEL]
WEBHOOK_HTTP_STATUS = [NÃO APLICÁVEL]
WEBHOOK_RESPONSE_BODY = [NÃO APLICÁVEL]
WEBHOOK_ERROR = [NÃO APLICÁVEL]
WEBHOOK_RETRY_COUNT = [NÃO APLICÁVEL]

Não esconda status HTTP ou mensagem de erro.

Pode mascarar tokens e dados pessoais.

==================================================
6. COMPARE COM O SERVIDOR
==================================================

Procure no ambiente de produção:

INBOUND_REQUEST_FOUND = NÃO
INBOUND_TIMESTAMP = [NÃO APLICÁVEL]
REQUEST_PATH = [NÃO APLICÁVEL]
REQUEST_METHOD = [NÃO APLICÁVEL]
HTTP_STATUS = [NÃO APLICÁVEL]
REQUEST_ID = [NÃO APLICÁVEL]

Se:

WEBHOOK_DELIVERY_ATTEMPTED = SIM

mas:

INBOUND_REQUEST_FOUND = NÃO

classifique:

FIRST_FAILURE_POINT = EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT

==================================================
7. SE A REQUEST CHEGOU, VEJA POR QUE FOI DESCARTADA
==================================================

Somente se INBOUND_REQUEST_FOUND = SIM:

WEBHOOK_HANDLER_ENTERED = [NÃO APLICÁVEL]
SIGNATURE_VALID = [NÃO APLICÁVEL]
PAYLOAD_PARSED = [NÃO APLICÁVEL]
EVENT_ACCEPTED = [NÃO APLICÁVEL]
INSTANCE_RESOLVED = [NÃO APLICÁVEL]
MESSAGE_FILTERED = [NÃO APLICÁVEL]
FILTER_REASON = [NÃO APLICÁVEL]
RUN_AGENT_STARTED = [NÃO APLICÁVEL]

==================================================
8. VERIFIQUE STATUS DO ENDPOINT PUBLICADO
==================================================

Sem enviar webhook falso e sem disparar atendimento,
verifique apenas a existência/configuração da rota.

Mostre:

PRODUCTION_BASE_URL = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app
WEBHOOK_ROUTE_DEPLOYED = SIM
WEBHOOK_ROUTE_AVAILABLE = SIM
DEPLOYED_COMMIT = e51f0bbb
EXPECTED_RUNTIME_COMMIT = e51f0bbb

Não faça POST de teste com mensagem simulada.

==================================================
9. PROCURE CONFIGURAÇÃO ANTIGA OU STALE
==================================================

Pesquise referências a URLs antigas de webhook.

Mostre:

OLD_WEBHOOK_URLS_FOUND = NÃO

Para cada uma:

URL | origem | unidade/instância | ativa SIM/NÃO

Depois:

VENTURA_USES_STALE_WEBHOOK_URL = NÃO

==================================================
10. COMPARE AS 3 UNIDADES
==================================================

Sem alterar nada, mostre:

CENTRO:
instanceId = agente-5541998430354
webhookUrl = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
connected = SIM

VENTURA:
instanceId = agente-5541998803684
webhookUrl = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
connected = SIM

BOULEVARD:
instanceId = agente-554130731358
webhookUrl = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
connected = SIM

As três podem ter instâncias diferentes,
mas devem apontar para a arquitetura correta de webhook.

Mostre:

VENTURA_WEBHOOK_CONFIGURATION_DIFFERS = NÃO

Se SIM, mostre exatamente a diferença.

==================================================
11. NÃO CORRIJA AINDA
==================================================

NÃO altere:

Julia
Gemini
model
prompt
chat.server.ts
context.ts
BEMP
list_services
list_slots
persistência
mapeamento de unidades
Evolution webhook
URL
event subscriptions
tokens
secrets

Primeiro prove a causa.

==================================================
CLASSIFICAÇÃO OBRIGATÓRIA
==================================================

Escolha UMA:

[X] Evolution não recebeu a mensagem
[ ] Evolution recebeu mas não gerou evento
[ ] evento correto não está inscrito
[ ] webhook está desabilitado
[ ] webhook aponta para URL errada
[ ] Evolution tentou e recebeu 404
[ ] Evolution tentou e recebeu 401/403
[ ] Evolution tentou e recebeu 5xx
[ ] Evolution teve erro de rede/DNS
[ ] webhook chegou ao servidor e foi filtrado
[ ] instância Ventura incorreta
[ ] outro

FIRST_FAILURE_POINT = EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT

==================================================
RESULTADO FINAL
==================================================

VENTURA_INSTANCE_ID = a1a837fe-c346-4e00-b9f3-9d02601bac52
VENTURA_UNIT_ID = 5258
EVOLUTION_INSTANCE_CONNECTED = SIM
WEBHOOK_ENABLED = SIM
WEBHOOK_URL_CONFIGURED = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
EXPECTED_WEBHOOK_URL = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
WEBHOOK_URL_MATCH = SIM
REQUIRED_MESSAGE_EVENT_SUBSCRIBED = SIM
EVOLUTION_MESSAGE_EVENT_FOUND = NÃO
WEBHOOK_DELIVERY_ATTEMPTED = NÃO
WEBHOOK_HTTP_STATUS = [NÃO APLICÁVEL]
INBOUND_REQUEST_FOUND = NÃO
RUN_AGENT_STARTED = NÃO
FIRST_FAILURE_POINT = EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT
ROOT_CAUSE = A Evolution API não registrou o evento de entrada para a mensagem enviada (ou não o enviou para o webhook).
SAFE_TO_FIX = SIM (Mas o problema é externo ao código do projeto)
SAFE_TO_DEPLOY = NÃO

NÃO CORRIJA.

PARE E AGUARDE MINHA AUTORIZAÇÃO.</h1>
      </div>
    </div>
  );
}







