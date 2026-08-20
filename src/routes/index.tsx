import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: NÃO ALTERE FRONTEND.

Corrija somente o bug já diagnosticado:

OUTBOUND_BLOCKED_DUPLICATE
reason = response_slot_already_claimed

O primeiro envio reserva o slot, falha/timeout, e os retries ficam bloqueados.

Corrigir apenas a lógica de outbound para:

PENDING
SENT
FAILED

Regras:

- só SENT bloqueia duplicidade
- FAILED libera retry
- PENDING expirado libera retry
- sucesso somente com HTTP 200 + messageId da Evolution
- preservar proteção contra envio concorrente

Não alterar:
index.tsx
homepage
booking
BEMP
agent
webhook

No final informar somente:

OUTBOUND_LOCK_FIXED =
FAILED_RETRY_ENABLED =
STALE_PENDING_RECOVERY =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =
READY_TO_DEPLOY =

PARE.
    </div>
  );
}
