import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-6 font-mono text-sm whitespace-pre">
      {`Execute esta instrucao no projeto: PARE. NÃO ALTERE NADA AINDA.

TESTE REAL DO WHATSAPP:

UNIDADE = VENTURA
unitId = 5258

SEQUÊNCIA REAL:

1. "Quero fazer mão hoje"
→ sistema perguntou:
"Qual serviço você gostaria de fazer? 💜"

2. "manicure"
→ sistema avançou corretamente:
"Vou verificar os horários disponíveis. Você prefere manhã, tarde ou noite?"

3. "a tarde"
→ sistema REPETIU:
"Vou verificar os horários disponíveis. Você prefere manhã, tarde ou noite?"

Portanto agora quero SOMENTE auditar a mensagem:

"a tarde"

==================================================
1. TRACE REAL
==================================================

Localize o atendimento real aproximadamente às 20:32.

Mostre:

TRACE_ID =
MESSAGE_TEXT =
MESSAGE_TIMESTAMP =
UNIT_ID =
BOOKING_CONTEXT_BEFORE =

==================================================
2. EXTRAÇÃO DO PERÍODO
==================================================

Mostre:

RAW_MESSAGE =
NORMALIZED_MESSAGE =

DAYPART_INTENT =
PERIOD_INTENT =
TIME_PERIOD =
PREFERRED_PERIOD =

AFTERNOON_DETECTED = SIM/NÃO

Teste explicitamente se estas formas são reconhecidas:

"tarde"
"a tarde"
"à tarde"
"de tarde"
"pela tarde"

Mostre:

TARDE_MATCH =
A_TARDE_MATCH =
CRASE_TARDE_MATCH =
DE_TARDE_MATCH =
PELA_TARDE_MATCH =

==================================================
3. CONTEXTO DO AGENDAMENTO
==================================================

Antes da mensagem "a tarde":

SERVICE_ID_PRESENT =
SERVICE_NAME_PRESENT =
DATE_PRESENT =
UNIT_ID_PRESENT =

Depois da mensagem "a tarde":

SERVICE_ID_PRESERVED =
SERVICE_NAME_PRESERVED =
DATE_PRESERVED =
UNIT_ID_PRESERVED =
DAYPART_PRESERVED =

==================================================
4. POR QUE REPETIU A PERGUNTA
==================================================

Mostre exatamente a condição que gerou novamente:

"Você prefere manhã, tarde ou noite?"

FILE =
FUNCTION =
LINE/REGION =
CONDITION =

Mostre:

DAYPART_MISSING_AT_DECISION_POINT =
BOOKING_CONTEXT_LOST =
CLARIFICATION_TRIGGERED =

==================================================
5. CLASSIFIQUE
==================================================

Escolha somente UMA:

A = "a tarde" não é reconhecido pelo parser
B = "tarde" é reconhecido mas não é salvo no bookingContext
C = período é salvo mas perdido antes de list_slots
D = período está correto mas outra regra repete a pergunta
E = contexto anterior do serviço/data foi perdido
F = outra causa comprovada

Mostre:

FAILURE_CLASS =
FIRST_FAILURE_POINT =
MINIMAL_FIX_REQUIRED =

NÃO CORRIJA.
NÃO FAÇA DEPLOY.
PARE.`}
    </div>
  )
});
