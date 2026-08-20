import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: CORRIJA SOMENTE 2 PONTOS NO BACKEND.

ARQUIVOS:
src/lib/evolution/idempotency.server.ts
src/lib/evolution/reply.server.ts

1. OUTBOUND PRESO EM "sending"

Hoje claimResponseSlot muda para "sending".

Se o envio Evolution lançar exception/timeout,
garantir que markResponseFailed(instance, messageId, erro)
seja chamado antes de propagar o erro.

Adicionar recuperação de "sending" antigo:
se processing_started_at estiver expirado,
permitir novo claim.

Não permitir dois envios simultâneos.

2. REMOVER RESTO DO HUMAN MODE

Em reply.server.ts ainda existe ensureAIAllowedToReply()
bloqueando por:

attendance_mode === "HUMAN"
ou
ai_paused_at

Remover esse bloqueio do fluxo da IA.

Não alterar frontend.
Não alterar index.tsx.
Não alterar booking/BEMP/webhook.

Testar:

envio falha/timeout
→ status failed
→ retry permitido

sending antigo expirado
→ retry permitido

envio sucesso
→ status sent
→ novo retry bloqueado

conversa antiga HUMAN
→ não bloqueia IA

Responder:

SEND_EXCEPTION_MARKS_FAILED =
STALE_SENDING_RECOVERY =
SUCCESS_MARKS_SENT =
DUPLICATE_AFTER_SENT_BLOCKED =
HUMAN_GUARD_REMOVED =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =
READY_TO_DEPLOY =

PARE.
    </div>
  );
}
