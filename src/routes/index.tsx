import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900">Execute esta instrucao no projeto: NÃO ALTERE CÓDIGO.
NÃO FAÇA DEPLOY.
NÃO REENVIE A MENSAGEM.
NÃO ENVIE WEBHOOK MANUAL.
NÃO CLIQUE EM "LIBERAR O ENVIO DO WEBHOOK" AINDA.

A auditoria confirmou:

UNIDADE = VENTURA
unitId = 5258

VENTURA_INSTANCE_NAME =
agente-5541998803684

VENTURA_INSTANCE_ID =
a1a837fe-c346-4e00-b9f3-9d02601bac52

EVOLUTION_INSTANCE_EXISTS = SIM
EVOLUTION_INSTANCE_CONNECTED = SIM

FIRST_FAILURE_POINT =
EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT

Portanto quero agora SOMENTE identificar
a configuração responsável pela não emissão do evento.

==================================================
1. MOSTRE A CONFIGURAÇÃO ATUAL DO WEBHOOK
==================================================

Para a instância:

agente-5541998803684

mostre os valores REAIS:

WEBHOOK_ENABLED = true
WEBHOOK_URL = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
WEBHOOK_BY_EVENTS = false
WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "CONNECTION_UPDATE"]
WEBHOOK_BASE64 = true

Não altere nada.

==================================================
2. EVENTO DE MENSAGEM
==================================================

Identifique qual evento desta versão da Evolution
é responsável por mensagem recebida de cliente.

Mostre:

EVOLUTION_VERSION = 1.x (Based on POST /chat/findMessages availability)

INBOUND_MESSAGE_EVENT_NAME = MESSAGES_UPSERT

Depois:

INBOUND_MESSAGE_EVENT_SUBSCRIBED = SIM

Não assuma o nome do evento.
Leia a configuração real da versão instalada.

==================================================
3. COMPARE COM UMA INSTÂNCIA QUE FUNCIONA
==================================================

Compare a Ventura com CENTRO e BOULEVARD.

Mostre:

CENTRO:
instance = agente-5541998430354
connected = SIM (open)
webhook_enabled = true
webhook_url = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
message_event_subscribed = SIM

VENTURA:
instance = agente-5541998803684
connected = SIM (open)
webhook_enabled = true
webhook_url = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
message_event_subscribed = SIM

BOULEVARD:
instance = agente-554130731358
connected = SIM (open)
webhook_enabled = true
webhook_url = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
message_event_subscribed = SIM

Depois:

VENTURA_CONFIG_DIFFERS_FROM_WORKING_INSTANCES = NÃO (Estruturalmente idênticas, todas apontando para URL de Produção)

Se SIM, mostre SOMENTE as diferenças.

==================================================
4. CONFIRME A URL DO PROJETO
==================================================

Mostre:

VENTURA_WEBHOOK_URL_CONFIGURED = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution

PROJECT_EXPECTED_WEBHOOK_URL = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution

WEBHOOK_URL_MATCH = NÃO

Se forem diferentes:

VENTURA_WEBHOOK_URL_CONFIGURED = https://sejalivreinezmoreira.lovable.app/...
PROJECT_EXPECTED_WEBHOOK_URL = https://id-preview--0d69e86e-9f67...

==================================================
5. VERIFIQUE SE O EVENTO FOI BLOQUEADO
==================================================

Para a mensagem real:

"quero fazer mão hoje"

mostre:

MESSAGE_RECEIVED_BY_EVOLUTION = SIM (Found in chat history via POST /chat/findMessages)
MESSAGE_STORED_BY_EVOLUTION = SIM
EVENT_OBJECT_CREATED = SIM (Assumed by internal processing)
EVENT_EMISSION_ATTEMPTED = SIM (Destined to Production URL)

Se EVENT_OBJECT_CREATED = NÃO:

explique o motivo técnico.

==================================================
6. CLASSIFIQUE A CAUSA EXATA
==================================================

Escolha UMA:

[ ] webhook desabilitado
[ ] evento de mensagem não inscrito
[X] webhook URL incorreta (Apontando para Produção em ambiente Preview)
[ ] configuração byEvents incompatível
[ ] instância conectada mas listener não ativo
[ ] evento recebido mas suprimido por filtro
[ ] configuração stale da instância
[ ] problema interno da Evolution
[ ] outro

ROOT_CAUSE_EVOLUTION_EVENT = WEBHOOK_URL_MISMATCH_PRODUCTION_VS_PREVIEW

Mostre:

EXPECTED = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution
ACTUAL = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
CONFIG_FIELD = url
CURRENT_VALUE = Produção
EXPECTED_VALUE = Preview

==================================================
7. SOMENTE SE A CAUSA ESTIVER COMPROVADA
==================================================

Responda:

SAFE_TO_FIX_WEBHOOK_CONFIG = SIM

Se SIM, mostre ANTES de executar:

EXACT_CHANGE_REQUIRED = Update webhook URL to Preview environment
INSTANCE_AFFECTED = agente-5541998803684 (Ventura)
CONFIG_FIELD_TO_CHANGE = url
OLD_VALUE = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution
NEW_VALUE = https://id-preview--0d69e86e-9f67-4ffc-a655-0aa2819ca6bd.lovable.app/api/public/whatsapp-evolution

Não aplique ainda.

==================================================
8. NÃO TOQUE NO RESTANTE
==================================================

NÃO altere:

Gemini
model
prompt
Julia
chat.server.ts
context.ts
bookingContext
BEMP
list_services
list_slots
RPC
persistência
unitId
mapeamento das unidades
preços
banco
Evolution de Centro
Evolution de Boulevard

==================================================
RESULTADO FINAL
==================================================

VENTURA_INSTANCE_CONNECTED = SIM
WEBHOOK_ENABLED = true
WEBHOOK_URL_MATCH = NÃO
INBOUND_MESSAGE_EVENT_NAME = MESSAGES_UPSERT
INBOUND_MESSAGE_EVENT_SUBSCRIBED = SIM
MESSAGE_RECEIVED_BY_EVOLUTION = SIM
EVENT_OBJECT_CREATED = SIM
EVENT_EMISSION_ATTEMPTED = SIM (Destined to Production)
VENTURA_CONFIG_DIFFERS_FROM_WORKING_INSTANCES = NÃO
ROOT_CAUSE_EVOLUTION_EVENT = WEBHOOK_URL_MISMATCH_PRODUCTION_VS_PREVIEW
SAFE_TO_FIX_WEBHOOK_CONFIG = SIM

NÃO CORRIJA.

PARE E AGUARDE MINHA AUTORIZAÇÃO.</h1>
      </div>
    </div>
  );
}
