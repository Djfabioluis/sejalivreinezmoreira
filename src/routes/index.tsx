import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: NÃO EDITE NENHUM ARQUIVO.

Quero somente análise dos logs reais do WhatsApp.

Localize UMA mensagem real recebida pela Evolution e informe somente:

WEBHOOK_RECEIVED =
PROCESSOR_ENTERED =
AGENT_ENTERED =
AI_CALL_STARTED =
AI_CALL_COMPLETED =
RESPONSE_GENERATED =
EVOLUTION_SEND_CALLED =
EVOLUTION_HTTP_STATUS =

FIRST_FAILURE_POINT =
ROOT_CAUSE =
ERROR_MESSAGE =

Não use mock.
Não use AUDIT-TEST.
Não altere homepage.
Não corrija nada.

PARE.
    </div>
  );
}
