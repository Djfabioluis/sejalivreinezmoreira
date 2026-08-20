import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: NÃO ALTERE CÓDIGO.

A IA continua sem responder mesmo após remover o módulo HUMAN.

Quero rastrear UMA mensagem real de uma instância conectada.

Envie o trace desta sequência:

WEBHOOK_RECEIVED =
INSTANCE_RESOLVED =
UNIT_RESOLVED =
AGENT_RESOLVED =
AI_ACTIVE =
PROCESSOR_ENTERED =
AGENT_ENTERED =
AI_CALL_STARTED =
AI_CALL_COMPLETED =
RESPONSE_GENERATED =
REPLY_ENTERED =
EVOLUTION_SEND_CALLED =
EVOLUTION_HTTP_STATUS =
OUTBOUND_SUCCESS =

Também informe:

FIRST_FAILURE_POINT =
ROOT_CAUSE =
ERROR_MESSAGE =

IMPORTANTE:
- usar mensagem REAL da Evolution
- não usar mock
- não usar AUDIT-TEST
- não corrigir ainda

PARE.
    </div>
  );
}
