import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: CORREÇÃO CRÍTICA — JULIA ESTÁ INFORMANDO PREÇOS ERRADOS DOS SERVIÇOS

PROBLEMA REAL:

A Julia está passando valores incorretos dos serviços para os clientes.

NÃO quero corrigir preços manualmente no prompt.
NÃO quero tabela de preços fixa dentro da IA.
NÃO quero valores hardcoded.

O preço deve vir SEMPRE da fonte oficial do serviço e da unidade correta.

==================================================
1. IDENTIFICAR A FONTE REAL DOS PREÇOS
==================================================

Audite onde a Julia atualmente obtém:

- nome do serviço
- preço
- duração
- unidade
- profissional
- preço de assinante/Beauty Club, quando aplicável

Mostre:

arquivo
função
query/API
tabela/endpoint
campos utilizados

Antes de alterar qualquer coisa, informe qual é hoje a fonte de preço.

==================================================
2. FONTE DE VERDADE
==================================================

A Julia deve utilizar a MESMA fonte utilizada pela Agenda/Serviços
integrada ao BEMP.

Se os serviços já estiverem sincronizados no banco local,
usar os registros sincronizados correspondentes ao serviço e unidade.

Não usar:

- preço memorizado pelo Gemini
- preço escrito no system prompt
- preço de outra unidade
- preço antigo de conversa anterior
- preço de serviço com nome parecido
- valor estimado

==================================================
3. PREÇO DEVE SER RESOLVIDO POR UNIDADE
==================================================

Antes de consultar preço:

inbound instanceId
→ agentId
→ unitId
→ unidade correta
→ serviço daquela unidade
→ preço oficial

Exemplo:

cliente escreve para Centro
→ consultar serviço/preço do Centro

cliente escreve para Ventura
→ consultar serviço/preço do Ventura

cliente escreve para Boulevard
→ consultar serviço/preço do Boulevard

Nunca misturar preços entre unidades.

==================================================
4. IDENTIFICAÇÃO DO SERVIÇO
==================================================

Quando o cliente informar:

"manicure"

não selecionar qualquer serviço que contenha "manicure".

Resolver corretamente o serviço disponível naquela unidade.

Evitar confundir, por exemplo:

MANICURE
MANICURE BEAUTY CLUB / ASSINANTES
MANICURE + PEDICURE
PACOTE MANICURE
outros serviços semelhantes

O matching precisa priorizar nome exato/normalizado e contexto da conversa.

==================================================
5. BEAUTY CLUB / ASSINANTES
==================================================

Não oferecer preço de assinante automaticamente.

Se existirem serviços como:

"Manicure Beauty Club (ASSINANTES)"

esse preço só pode ser usado quando o cliente estiver identificado
como elegível/assinante do plano correspondente.

Para cliente comum:
usar preço normal.

Para assinante confirmado:
usar preço do serviço/plano aplicável.

Não perguntar sobre assinatura em toda conversa.

Verificar assinatura somente quando isso for necessário para o
serviço/plano solicitado.

==================================================
6. NÃO DEIXAR GEMINI INVENTAR PREÇO
==================================================

Quando a resposta envolver valor:

o backend deve fornecer ao Gemini explicitamente:

serviceName
serviceId
unitId
price
duration

A instrução deve ser:

"Use exclusivamente o preço recebido nos dados estruturados.
Nunca altere, estime ou invente preço."

Se price estiver ausente:

a Julia NÃO deve inventar.

Responder algo como:

"Vou confirmar o valor desse serviço para você. 💜"

e registrar erro técnico de preço ausente.

==================================================
7. FORMATAÇÃO
==================================================

Valor armazenado como:

35
35.0
35.00

deve aparecer:

R$ 35,00

Não transformar:

35 → 350
3500 → 35
centavos → reais

Auditar se o BEMP/API retorna preço em:

reais
centavos
decimal
string

e normalizar corretamente UMA única vez.

==================================================
8. LOG OBRIGATÓRIO
==================================================

Quando a Julia informar preço, registrar:

[SERVICE_PRICE_RESOLVED]

traceId
instanceId
unitId
serviceId
serviceName
rawPrice
normalizedPrice
priceSource
isSubscriberPrice
customerEligibility

Isso permitirá provar de onde veio cada valor.

==================================================
9. TESTE REAL
==================================================

Selecionar pelo menos 3 serviços reais de cada unidade:

Centro
Ventura
Boulevard

Comparar:

PREÇO NO BEMP/FONTE OFICIAL
vs
PREÇO NO BANCO SINCRONIZADO
vs
PREÇO INFORMADO PELA JULIA

Tabela:

Unidade | Serviço | Fonte oficial | Banco | Julia | Resultado

Todos devem ser iguais.

Também testar serviço normal x serviço Beauty Club/assinante.

==================================================
10. NÃO ALTERAR
==================================================

Não alterar agora:

- webhook
- Evolution
- roteamento de instâncias
- limite de histórico
- idempotência
- Follow-up
- máquina de estados de agendamento
- status das conversas

Corrigir exclusivamente:

RESOLUÇÃO DO SERVIÇO
+
FONTE DO PREÇO
+
NORMALIZAÇÃO DO VALOR
+
PROTEÇÃO CONTRA PREÇO INVENTADO

==================================================
CRITÉRIO FINAL
==================================================

A Julia só pode informar um preço quando existir:

unitId correto
+
serviceId correto
+
preço obtido da fonte oficial

Nunca usar preço por memória do modelo.

No final, informe exatamente:

1. de onde o preço estava vindo;
2. por que estava incorreto;
3. fonte oficial adotada;
4. regra usada para unidade;
5. regra normal x assinante;
6. teste comparativo com serviços reais.`;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-4 space-y-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl text-foreground">
            Seja Livre AI Platform
          </h1>
          <div className="text-muted-foreground text-lg sm:text-xl max-w-2xl mx-auto whitespace-pre-wrap text-left bg-muted/50 p-6 rounded-lg border border-border font-mono text-xs">
            {instructions}
          </div>
        </div>
      </div>
    </div>
  )
}
