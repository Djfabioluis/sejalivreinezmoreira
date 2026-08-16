import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 font-sans text-slate-900">
      <div className="flex items-center justify-between border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900 whitespace-pre-wrap">Execute esta instrucao no projeto: PARE. NÃO ALTERE CÓDIGO.
NÃO ALTERE O WEBHOOK.
NÃO APONTE A EVOLUTION PARA PREVIEW.
NÃO FAÇA DEPLOY.
NÃO REENVIE A MENSAGEM AINDA.

A nova auditoria confirmou:

- a mensagem "quero fazer mão hoje" FOI recebida pela Evolution;
- a mensagem FOI armazenada;
- a instância Ventura está conectada;
- o webhook da Ventura aponta para PRODUÇÃO;
- as três unidades usam o webhook de produção;
- o monitoramento anterior estava olhando PREVIEW.

Portanto o diagnóstico anterior
EVOLUTION_DID_NOT_EMIT_MESSAGE_EVENT
não pode mais ser considerado comprovado.

Agora quero SOMENTE AUDITORIA READ-ONLY DOS LOGS DE PRODUÇÃO.

==================================================
1. LOCALIZE A MENSAGEM EM PRODUÇÃO
==================================================

Procure no ambiente de PRODUÇÃO pelo evento da mensagem:

"quero fazer mão hoje"

UNIDADE:
VENTURA

unitId esperado:
5258

Janela aproximada:
17:35 UTC até 17:45 UTC

Mostre:

PRODUCTION_INBOUND_REQUEST_FOUND =
PRODUCTION_REQUEST_TIMESTAMP =
TRACE_ID =
REQUEST_ID =
WEBHOOK_EVENT_TYPE =
INSTANCE_ID =
UNIT_ID_RESOLVED =
RAW_TEXT_MATCH =

==================================================
2. CONFIRME O ENDPOINT REAL
==================================================

Mostre:

EVOLUTION_WEBHOOK_TARGET_URL =
PRODUCTION_WEBHOOK_ROUTE =
REQUEST_PATH =
HTTP_METHOD =
HTTP_STATUS_RETURNED_TO_EVOLUTION =

Depois:

WEBHOOK_REACHED_PRODUCTION = SIM/NÃO

==================================================
3. SE CHEGOU À PRODUÇÃO
==================================================

Para o mesmo TRACE_ID mostre a sequência cronológica:

WEBHOOK_HANDLER_ENTERED =
PAYLOAD_PARSED =
MESSAGE_ACCEPTED =
INSTANCE_RESOLVED =
RUN_AGENT_STARTED =
BOOKING_CONTEXT_LOADED =
MODEL_CALL_STARTED =
MODEL_CALL_SUCCESS =
LIST_SERVICES_CALLED =
RESPONSE_GENERATED =
OUTBOUND_SEND_ATTEMPTED =
OUTBOUND_SEND_SUCCESS =

==================================================
4. IDENTIFIQUE O PRIMEIRO PONTO DE FALHA
==================================================

Escolha SOMENTE um:

[ ] produção não recebeu o webhook
[ ] rota respondeu 404
[ ] rota respondeu 401/403
[ ] rota respondeu 5xx
[ ] payload foi rejeitado
[ ] instância não foi resolvida
[ ] mensagem foi filtrada
[ ] runAgent não iniciou
[ ] erro no Gemini/modelo
[ ] erro na BEMP
[ ] erro na persistência
[ ] resposta foi gerada mas não enviada
[ ] Evolution recusou o envio da resposta
[ ] outro

FIRST_FAILURE_POINT =

EXPECTED =
ACTUAL =
ERROR_CODE =
ERROR_MESSAGE =
FILE =
FUNCTION =

==================================================
5. SE HOUVE RESPOSTA GERADA
==================================================

Mostre:

RESPONSE_GENERATED =
RESPONSE_TEXT_LENGTH =
OUTBOUND_PROVIDER =
OUTBOUND_ENDPOINT =
OUTBOUND_HTTP_STATUS =
OUTBOUND_MESSAGE_ID =
OUTBOUND_ERROR =

==================================================
6. NÃO CONFUNDA PREVIEW COM PRODUÇÃO
==================================================

Mostre:

PREVIEW_LOG_USED_IN_OLD_DIAGNOSIS = SIM/NÃO
PRODUCTION_LOG_AVAILABLE = SIM/NÃO

Depois:

OLD_DIAGNOSIS_INVALIDATED_BY_ENVIRONMENT_MISMATCH =
SIM/NÃO

==================================================
7. NÃO CORRIJA NADA
==================================================

NÃO altere:

Evolution
webhook URL
event subscriptions
Gemini
model
prompt
BEMP
list_services
list_slots
persistência
unit mapping
chat.server.ts
context.ts
banco
RPC

==================================================
RESULTADO FINAL
==================================================

MESSAGE_RECEIVED_BY_EVOLUTION =
WEBHOOK_TARGET_IS_PRODUCTION =
PRODUCTION_INBOUND_REQUEST_FOUND =
WEBHOOK_REACHED_PRODUCTION =
RUN_AGENT_STARTED =
MODEL_CALL_SUCCESS =
LIST_SERVICES_CALLED =
RESPONSE_GENERATED =
OUTBOUND_SEND_ATTEMPTED =
OUTBOUND_SEND_SUCCESS =
FIRST_FAILURE_POINT =
ROOT_CAUSE =
SAFE_TO_FIX =
SAFE_TO_DEPLOY = NÃO

NÃO ALTERE NADA.
PARE E AGUARDE MINHA AUTORIZAÇÃO.</h1>
      </div>
    </div>
  );
}
