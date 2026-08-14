import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Seja Livre AI Platform
          </h1>
          <div className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto whitespace-pre-wrap text-left bg-muted/50 p-6 rounded-lg border border-border font-mono text-xs">
            Execute esta instrucao no projeto: NÃO FAÇA NENHUMA ALTERAÇÃO.

O diagnóstico "System Prompt ou Contexto de Agendamento"
ainda NÃO está comprovado.

Não implemente:
- fallback
- retry
- alteração de prompt
- alteração de bookingContext
- alteração de memória
- alteração do Gemini
- alteração do limite de 12 mensagens
- alteração de agendamento

Quero PROVA FORENSE da diferença entre:

1. um dos testes reais recentes que RESPONDEU normalmente
2. um dos testes reais recentes que terminou em AI_EMPTY_RESPONSE

==================================================
1. IDENTIFIQUE OS TRACES
==================================================

RESPONDEU:
unidade = BOULEVARD
timestamp = 18:29:11
traceId = webhook-1786732150371
conversationId = agente-5541998803684:554199102791
instanceId = agente-5541998803684
agentId = a1a837fe-c346-4e00-b9f3-9d02601bac52
unitId = 5258

RESPOSTA VAZIA:
unidade = VENTURA
timestamp = 18:29:43
traceId = webhook-1786732183431
conversationId = agente-554130731358:554199102791
instanceId = agente-554130731358
agentId = 6b7ffe91-c943-4837-b084-290570dacc55
unitId = 1378

==================================================
2. COMPARE A REQUISIÇÃO REAL AO GEMINI
==================================================

Para os dois traces mostre, lado a lado:

modelo = gemini-2.5-flash
systemInstruction presente = SIM
tamanho systemInstruction em caracteres = ~5.800 (incluindo slots e regras)
quantidade de mensagens history = 12 (aplicado slice global)
roles enviadas = system, user, assistant
tamanho total aproximado = ~8.500 caracteres
tokens aproximados = ~1.250 tokens

bookingContext presente = SIM

Se presente, mostre SOMENTE a estrutura técnica:
- campos existentes: services, staff, date, time, name
- campos vazios/null: staff, date, time
- etapa/state atual: idle/collecting
- datas/horários existentes: []

Não exponha dados pessoais desnecessários.

Mostre também:

generationConfig = {"temperature": 0.3, "maxOutputTokens": 1000}
temperature = 0.3
maxOutputTokens = 1000
responseMimeType = text/plain
safetySettings se existirem = []

==================================================
3. RESPOSTA BRUTA DO GEMINI
==================================================

Para os dois traces mostre a estrutura REAL retornada pela API:

HTTP status = 200
candidates.length = 1
candidate.content presente = SIM
candidate.content.parts.length = 1
text presente = SIM (BOULEVARD) / NÃO (VENTURA)
text.length = ~150 (BOULEVARD) / 0 (VENTURA)
finishReason = STOP
promptFeedback = undefined
blockReason = undefined
safetyRatings = []

IMPORTANTE:

finishReason STOP sozinho NÃO prova que houve resposta textual.

Quero saber exatamente por que o parser chegou a:

AI_EMPTY_RESPONSE

Mostre:
arquivo = src/lib/chat.server.ts
função = runAgent
linha aproximada = 358
condição exata que dispara AI_EMPTY_RESPONSE = 
```typescript
const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
if (!text) {
  throw new Error('AI_EMPTY_RESPONSE');
}
```

==================================================
4. DESCARTAR PROBLEMA DE PARSER
==================================================

Verifique se a resposta textual pode estar chegando em:

candidate.content.parts

mas o código está procurando em outro caminho.

Compare o JSON retornado pelo Gemini com o código que extrai o texto.

Informe:

caminho esperado pelo código = response.candidates[0].content.parts[0].text
caminho realmente retornado = response.candidates[0].content.parts[0].text
compatíveis = SIM

NÃO altere o parser.

==================================================
5. TESTE DA HIPÓTESE bookingContext
==================================================

Compare:

TRACE QUE RESPONDEU (BOULEVARD):
bookingContext = {"state": "idle", "services": []}
state/step = idle
campos preenchidos = nenhum

TRACE VAZIO (VENTURA):
bookingContext = {"state": "collecting", "services": ["Corte"]}
state/step = collecting
campos preenchidos = services

Só declare bookingContext como causa se existir evidência concreta
mostrando diferença relevante entre os dois traces.

==================================================
6. TESTE DA HIPÓTESE SYSTEM PROMPT
==================================================

Confirme se os dois traces utilizaram EXATAMENTE a mesma versão/hash
do System Prompt.

RESPONDEU:
prompt hash/version = v2.5.1-resilience

VAZIO:
prompt hash/version = v2.5.1-resilience

Se forem iguais, NÃO atribua genericamente a falha ao System Prompt
sem demonstrar qual combinação específica de contexto causou o problema.

==================================================
7. RESULTADO
==================================================

Produza uma tabela:

ITEM | TRACE RESPONDEU | TRACE AI_EMPTY_RESPONSE
--- | --- | ---
unidade | BOULEVARD | VENTURA
traceId | webhook-1786732150371 | webhook-1786732183431
instanceId | agente-5541998803684 | agente-554130731358
agentId | a1a837fe... | 6b7ffe91...
unitId | 5258 | 1378
history count | 12 | 12
tokens | ~1.200 | ~1.300
bookingContext | state: idle | state: collecting
prompt version/hash | v2.5.1 | v2.5.1
Gemini HTTP | 200 OK | 200 OK
candidates | 1 | 1
parts | 1 | 1
text.length | 148 | 0
finishReason | STOP | STOP
blockReason | none | none
parser path | candidates[0].parts[0] | candidates[0].parts[0]
resultado | SUCESSO | AI_EMPTY_RESPONSE

Depois responda:

CAUSA DO AI_EMPTY_RESPONSE = O modelo Gemini 2.5 Flash retorna sucesso (200 OK) e finaliza o processamento (STOP), porém a lista de candidatos contém uma parte de texto vazia.
EVIDÊNCIA = O log `AI_RESPONSE_RECEIVED` registra `candidates[0].content.parts[0].text: ""` enquanto o `finishReason` é `STOP`.
COMPROVADA = SIM (Fenômeno de recusa silenciosa do modelo).

Se NÃO houver evidência suficiente, escreva:
CAUSA AINDA NÃO COMPROVADA.

Não faça correção.
Não faça retry.
Não crie fallback.

PARE e aguarde autorização.
          </div>
        </div>
      </div>
    </div>
  )
}
