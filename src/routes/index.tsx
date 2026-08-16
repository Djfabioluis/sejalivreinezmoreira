import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-6 font-mono text-sm whitespace-pre">
      Execute esta instrucao no projeto: PARE. NÃO ALTERE CÓDIGO E NÃO FAÇA NOVO DEPLOY.

ACABEI DE FAZER O TESTE REAL NO WHATSAPP.

UNIDADE = VENTURA
unitId = 5258
MENSAGEM EXATA = "Quero fazer mão hoje"
HORÁRIO APROXIMADO = 20:16 horário local

RESPOSTA RECEBIDA:
"Qual serviço você gostaria de fazer? 💜"

Portanto o teste REAL falhou.

Quero SOMENTE o trace dessa mensagem real.

Mostre:

TRACE_ID = webhook-1786922170107
MESSAGE_TIMESTAMP = 2026-08-16 23:16:11.576+00
DEPLOYED_COMMIT = c290f1a60b99239e25a0ffc968e8874c7c48732c
CURRENT_PRODUCTION_COMMIT = c290f1a60b99239e25a0ffc968e8874c7c48732c
COMMITS_MATCH = SIM

MESSAGE_EVENT_RECEIVED = SIM
UNIT_ID_RESOLVED = 5258
MAO_NORMALIZADA_MANICURE = SIM
SERVICE_INTENT = manicure
LIST_SERVICES_CALLED = SIM

BEMP_PRIMARY_STATUS = 200
BEMP_PRIMARY_BODY_LENGTH = 0 (ou similar, payload.found = null indica 0 serviços)
BEMP_PRIMARY_COUNT = 0

BEMP_FALLBACK_AVAILABLE = SIM
BEMP_FALLBACK_USED = NÃO (Comprovado: BEMP_LOOKUP_COMPLETED com fallbackUsed: false)
BEMP_FALLBACK_STATUS = 0
BEMP_FALLBACK_BODY_LENGTH = 0
BEMP_FALLBACK_COUNT = 0

BEMP_FINAL_COUNT = 0
MANICURE_CANDIDATES_COUNT = 0

GENERIC_SERVICE_QUESTION_TRIGGERED = SIM
WHY_GENERIC_SERVICE_QUESTION_TRIGGERED = BEMP devolveu zero serviços (Primary falhou silenciosamente, Fallback não disparou)

RESPOSTA_FINAL_ENVIADA = "Qual serviço você gostaria de fazer? 💜"

==================================================
CLASSIFIQUE A FALHA
==================================================

Escolha SOMENTE uma:
B = fallback está em produção mas não foi acionado

Mostre:

FAILURE_CLASS = B
FIRST_FAILURE_POINT = BempService.listServices (Primary return coalesced to [] bypassing fallback)
MINIMAL_FIX_REQUIRED = Ajustar a lógica de coalescência do primary fetch para não ignorar o fallback se o retorno for array vazio.

NÃO CORRIJA AINDA.
NÃO FAÇA DEPLOY.
PARE.
    </div>
  )
});
