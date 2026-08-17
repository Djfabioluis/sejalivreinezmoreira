Execute esta instrucao no projeto: CORRIJA SOMENTE A CONSULTA DE PREÇO DOS SERVIÇOS PELA JULIA.

NÃO ALTERE:
- Evolution
- webhook
- cancelamento
- criação de agendamento
- datas
- profissionais
- slots
- confirmação
- frontend
- mapeamento de unidades

PROBLEMA REAL:

Quando o cliente pergunta preço/valor de um serviço,
a Julia não informa o preço.

Exemplos:

"Quanto custa manicure?"
"Qual o valor da mão?"
"Preço da escova"
"Quanto é pé e mão?"
"Quanto vocês cobram para fazer unha?"
"Qual valor desse serviço?"

A Julia deve consultar o CATÁLOGO REAL da BEMP
da unidade correta e responder o preço real.

==================================================
1. CRIAR PRICE_INTENT
==================================================

Detectar deterministicamente intenção de preço.

Exemplos:

preço
preco
valor
quanto custa
quanto é
quanto sai
quanto fica
qual o valor
quanto vocês cobram

Mostrar internamente:

PRICE_INTENT_DETECTED = SIM

Essa intenção deve ser detectada ANTES de avançar
automaticamente para data/período/agendamento.

==================================================
2. IDENTIFICAR O SERVIÇO
==================================================

Se a mensagem já contém um serviço:

"quanto custa manicure?"

resolver:

SERVICE_INTENT = manicure

Usar a normalização existente do projeto.

Preservar exemplos já existentes:

"mão" / "mao" → manicure

NÃO criar catálogo paralelo.

NÃO inventar nome de serviço.

==================================================
3. CONSULTAR A BEMP REAL
==================================================

Usar a integração existente de serviços da BEMP.

A fonte de verdade para preço é o serviço REAL da unidade.

Consultar usando:

conversationUnitId
serviceId/serviceName normalizado

Extrair do payload real:

serviceId
serviceName
price/value
duration, se disponível

NÃO usar preço hardcoded.

NÃO usar preço de outra unidade.

==================================================
4. RESPOSTA DE PREÇO
==================================================

Se encontrar exatamente um serviço:

Exemplo:

Cliente:
"Quanto custa manicure?"

Resposta:

"A Manicure custa R$ 35,00 💜
Quer que eu veja os horários disponíveis?"

Use o preço REAL retornado pela BEMP.

Formatação brasileira:

R$ 35,00
R$ 120,00

Nunca:

35.00
BRL 35
3500

==================================================
5. NÃO PULAR A PERGUNTA DO CLIENTE
==================================================

Se PRICE_INTENT = SIM:

primeiro responder o preço.

NÃO responder diretamente:

"Qual dia você prefere?"

sem informar o valor solicitado.

Depois do preço pode perguntar:

"Quer agendar?"

ou equivalente.

==================================================
6. SE O CLIENTE PERGUNTAR SÓ "QUAL O PREÇO?"
==================================================

Se não houver serviço identificável no contexto atual:

Se bookingContext.serviceId/serviceName já existir,
usar o serviço atual.

Se não existir:

perguntar UMA vez:

"Claro 💜 De qual serviço você gostaria de saber o valor?"

Não inventar um serviço.

==================================================
7. PREÇO DURANTE UM FLUXO DE AGENDAMENTO
==================================================

Exemplo:

Julia:
"Qual dia você prefere?"

Cliente:
"Antes, quanto custa?"

Se bookingContext contém:

serviceName = MANICURE

a Julia deve responder:

"A Manicure custa R$ X,XX 💜"

e PRESERVAR o bookingContext.

Depois pode continuar:

"Se quiser seguir com o agendamento, qual dia você prefere?"

NÃO apagar:

serviceId
serviceName
professional
date já preenchida
period
outros dados válidos

==================================================
8. SERVIÇOS AMBÍGUOS
==================================================

Se a consulta retornar mais de um serviço parecido:

Exemplo:
"escova"

e existirem:

Escova curta
Escova média
Escova longa

NÃO escolher preço aleatório.

Responder mostrando as opções reais:

"Encontrei estas opções de escova 💜

• Escova curta — R$ X,XX
• Escova média — R$ X,XX
• Escova longa — R$ X,XX

Qual delas você deseja?"

==================================================
9. PREÇO NÃO DISPONÍVEL
==================================================

Se o serviço existe mas a BEMP não retornar preço válido:

NÃO inventar preço.

Responder:

"Encontrei o serviço, mas o valor não está disponível no catálogo no momento. 💜"

Registrar:

SERVICE_FOUND = SIM
PRICE_FOUND = NÃO

==================================================
10. PROTEÇÃO DE UNIDADE
==================================================

O preço deve pertencer à unidade da conversa.

Obrigatório:

REQUEST_UNIT_ID == CONVERSATION_UNIT_ID

Não usar fallback Centro.

Não reaproveitar catálogo de outra unidade.

==================================================
11. NÃO CHAMAR GEMINI PARA INVENTAR PREÇO
==================================================

Se o preço for encontrado na BEMP:

PRICE_RESPONSE_DETERMINISTIC = SIM
SKIP_GENERIC_AI_PRICE_GENERATION = SIM

Gemini pode humanizar o texto somente se não alterar:

nome do serviço
preço
unidade

O valor nunca pode ser criado pelo modelo.

==================================================
12. TESTES OBRIGATÓRIOS
==================================================

TESTE A

Input:
"Quanto custa manicure?"

BEMP:
Manicure = R$ 35,00

Esperado:

PRICE_INTENT_DETECTED = SIM
SERVICE_RESOLVED = SIM
BEMP_SERVICE_LOOKUP_CALLED = SIM
PRICE_FOUND = SIM
PRICE_RESPONSE = contém "R$ 35,00"
ASK_DATE_BEFORE_PRICE = NÃO

TESTE B

Contexto:
service = manicure

Input:
"Qual o valor?"

Esperado:

CONTEXT_SERVICE_USED = SIM
PRICE_RESPONSE_GENERATED = SIM
BOOKING_CONTEXT_PRESERVED = SIM

TESTE C

Input:
"Quanto custa mão?"

Esperado:

NORMALIZED_SERVICE = manicure
PRICE_FOUND = SIM

TESTE D

Input:
"Preço da escova"

BEMP retorna 3 variações.

Esperado:

MULTIPLE_SERVICE_OPTIONS = SIM
RANDOM_PRICE_SELECTED = NÃO

TESTE E

Serviço encontrado sem preço.

Esperado:

PRICE_INVENTED = NÃO
SAFE_NO_PRICE_RESPONSE = SIM

==================================================
13. REGRESSÃO
==================================================

PRESERVE:

CANCEL_INTENT = funcionando
DUPLICATE_OUTBOUND = corrigido
MAO_TO_MANICURE = funcionando
DATE_FLOW = funcionando
PROFESSIONAL_FLOW = funcionando
PERIOD_FLOW = funcionando
LIST_SLOTS = funcionando
CREATE_BOOKING = funcionando

==================================================
14. VALIDAÇÃO
==================================================

Execute:

PRICE_INTENT_FIXED =
REAL_BEMP_PRICE_USED =
CONTEXT_SERVICE_PRICE_FIXED =
BRAZILIAN_CURRENCY_FORMAT_FIXED =
AMBIGUOUS_SERVICE_PRICE_FIXED =
PRICE_WITHOUT_SERVICE_FIXED =
UNIT_PRICE_PROTECTION_FIXED =
PRICE_HALLUCINATION_BLOCKED =
BOOKING_CONTEXT_PRESERVED =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =

==================================================
15. DEPLOY
==================================================

Se tudo passar:

AUTORIZO DEPLOY/PUBLISH.

NÃO envie WhatsApp automaticamente.
NÃO crie agendamento real automaticamente.

Responda SOMENTE:

PRICE_INTENT_FIXED =
REAL_BEMP_PRICE_USED =
CONTEXT_SERVICE_PRICE_FIXED =
BRAZILIAN_CURRENCY_FORMAT_FIXED =
AMBIGUOUS_SERVICE_PRICE_FIXED =
UNIT_PRICE_PROTECTION_FIXED =
PRICE_HALLUCINATION_BLOCKED =
BOOKING_CONTEXT_PRESERVED =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =
DEPLOY_SUCCESS =
READY_FOR_REAL_PRICE_TEST =

PARE.
