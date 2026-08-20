import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: CORRIJA SOMENTE O OUTBOUND DUPLICATE LOCK.

Causa comprovada:

OUTBOUND_BLOCKED_DUPLICATE
reason = response_slot_already_claimed

Hoje o sistema reserva o slot antes do envio real.
Se o primeiro envio falha/timeout, os retries ficam bloqueados
e o cliente não recebe resposta.

REGRA CORRETA:

1. Só considerar resposta definitivamente enviada quando:
   EVOLUTION_HTTP_STATUS = sucesso
   E
   EVOLUTION_MESSAGE_ID existir.

2. Usar estados:
   PENDING
   SENT
   FAILED

3. Se envio falhar:
   marcar FAILED e liberar retry.

4. Se PENDING ficar preso por timeout:
   usar lease/TTL e permitir novo retry após expirar.

5. Bloquear duplicidade somente quando:
   status = SENT

6. Não permitir dois envios concorrentes.

7. Não alterar:
   webhook
   agent
   booking
   BEMP
   service hours
   instance mapping

Teste obrigatório:

primeiro envio falha
→ status FAILED
→ retry permitido
→ Evolution 200
→ status SENT
→ OUTBOUND_SUCCESS = SIM

Depois:

novo retry do mesmo evento
→ bloqueado porque já está SENT

Responda:

DUPLICATE_LOCK_FIXED =
FAILED_SEND_RELEASES_RETRY =
STALE_PENDING_RECOVERY =
SENT_ONLY_BLOCKS_DUPLICATE =
CONCURRENT_SEND_PROTECTED =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =
READY_TO_DEPLOY =

PARE.
    </div>
  );
}
