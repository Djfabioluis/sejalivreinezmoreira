import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-6 font-mono text-sm whitespace-pre">
      {`Execute esta instrucao no projeto: AUTORIZO A CORREÇÃO MÍNIMA AGORA.

CAUSA COMPROVADA:

FAILURE_CLASS = B
FIRST_FAILURE_POINT = BempService.listServices

O PRIMARY recebe body vazio no Worker, mas esse estado está
sendo convertido/coalescido para [] ANTES da decisão de fallback.

Como [] é tratado como retorno válido, o fallback existente
não é acionado.

CORRIJA SOMENTE ESSA CONDIÇÃO.

==================================================
1. ALTERE SOMENTE O NECESSÁRIO
==================================================

Arquivo principal:

src/lib/bemp-service.server.ts

PRESERVE:

src/routes/api/public/bemp-services-relay.ts

NÃO altere:
- Julia
- Gemini
- Evolution
- webhook
- booking
- matching
- normalização
- unitId
- preços
- list_slots
- src/routes/index.tsx

==================================================
2. DIFERENCIE BODY VAZIO DE JSON []
==================================================

IMPORTANTE:

Um HTTP body realmente vazio NÃO pode ser convertido
silenciosamente em [] antes da decisão de fallback.

Comportamento correto:

CASO A:
HTTP 200
body length = 0

=> PRIMARY_TRANSPORT_EMPTY = SIM
=> ACIONAR FALLBACK

CASO B:
HTTP 200
body contém JSON válido:
[]

=> é uma resposta válida da API
=> NÃO confundir automaticamente com body vazio.

Portanto remova/corrija qualquer lógica semelhante a:

resultado ?? []
body vazio => []
catch => []

que esconda a condição de transporte vazio antes do fallback.

==================================================
3. FALLBACK
==================================================

Fluxo obrigatório:

PRIMARY
↓
se body vazio / resposta impossível de interpretar por ausência de body
↓
FALLBACK bemp-services-relay
↓
retorno final

Máximo:

PRIMARY_ATTEMPTS = 1
FALLBACK_ATTEMPTS = 1

Sem loop.

==================================================
4. NÃO ENGULA ERROS
==================================================

Se PRIMARY falhar e FALLBACK falhar:

NÃO retorne [] silenciosamente.

Registre erro diagnosticável.

==================================================
5. TESTE UNIT 5258
==================================================

Teste sem WhatsApp:

unitId = 5258

Quero ver:

PRIMARY_HTTP_STATUS =
PRIMARY_BODY_LENGTH =
PRIMARY_TRANSPORT_EMPTY =
PRIMARY_COUNT =

FALLBACK_TRIGGER_CONDITION =
FALLBACK_USED =
FALLBACK_HTTP_STATUS =
FALLBACK_BODY_LENGTH =
FALLBACK_COUNT =

FINAL_SERVICE_COUNT =
MANICURE_SERVICE_COUNT =

==================================================
6. TESTE O CASO EXATO DO BUG
==================================================

Simule/controladamente:

PRIMARY HTTP 200 + body vazio

Resultado obrigatório:

PRIMARY_TRANSPORT_EMPTY = SIM
FALLBACK_USED = SIM

e o retorno do fallback deve chegar ao consumidor.

Mostre:

EMPTY_BODY_TEST_PASS =

==================================================
7. VALIDAÇÃO
==================================================

BUILD_PASS =
TYPECHECK_PASS =

FILES_CHANGED =

Obrigatório:

BUSINESS_LOGIC_CHANGED = NÃO
BOOKING_LOGIC_CHANGED = NÃO
MATCHING_CHANGED = NÃO
NORMALIZATION_CHANGED = NÃO
RELAY_CHANGED = NÃO, salvo se estritamente necessário

==================================================
8. SE TUDO PASSAR
==================================================

Se:

EMPTY_BODY_TEST_PASS = SIM
BUILD_PASS = SIM
TYPECHECK_PASS = SIM

AUTORIZO O DEPLOY/PUBLISH.

Após publicar faça SOMENTE uma sonda técnica em produção
para unitId 5258.

NÃO envie WhatsApp automaticamente.

Mostre:

PRODUCTION_PRIMARY_BODY_LENGTH =
PRODUCTION_PRIMARY_TRANSPORT_EMPTY =
PRODUCTION_FALLBACK_USED =
PRODUCTION_FALLBACK_COUNT =
PRODUCTION_FINAL_COUNT =
PRODUCTION_MANICURE_COUNT =

Se:

PRODUCTION_FINAL_COUNT > 0
e
PRODUCTION_MANICURE_COUNT > 0

READY_FOR_REAL_WHATSAPP_TEST = SIM

PARE.`}
    </div>
  )
});
