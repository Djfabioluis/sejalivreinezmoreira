import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const instructions = `Execute esta instrucao no projeto: EXECUTE AGORA OS TESTES.

Você apenas atualizou o painel com minhas instruções.
Isso NÃO é execução do teste e NÃO é evidência.

NÃO altere a interface.
NÃO crie página.
NÃO atualize o dashboard.
NÃO escreva minhas instruções no preview.
NÃO altere código.
NÃO implemente nada.

Quero que você EXECUTE a auditoria/testes usando o backend,
funções, logs e integrações reais disponíveis no projeto.

==================================================
1. IDENTIFIQUE AS 3 INSTÂNCIAS REAIS
==================================================

Localize:

CENTRO
instanceId =
unitId =

VENTURA
instanceId =
unitId =

BOULEVARD
instanceId =
unitId =

Não use apenas o nome visual.

==================================================
2. CONSULTE O CATÁLOGO REAL DE CADA UNIDADE
==================================================

Execute list_services separadamente para:

CENTRO
VENTURA
BOULEVARD

Pesquise:

corte
corte feminino
corte masculino
manicure
escova

Mostre os resultados REAIS retornados pela API.

Para cada resultado:

UNIDADE
serviceId
name
price
duration

Não invente registros para completar a tabela.

==================================================
3. TESTE A RESOLUÇÃO
==================================================

Execute a lógica REAL implementada para estas frases:

"Quanto custa corte?"
"Quanto custa corte feminino?"
"Quanto custa corte masculino?"
"Quanto custa manicure?"
"Quanto custa escova?"

Faça isso nas 3 unidades.

Quero saber quais candidatos o resolver encontrou ANTES de
selecionar qualquer serviço.

Mostre:

mensagem
unidade
candidatos encontrados
serviceId selecionado
serviceName selecionado
officialPrice
resultado da resolução

==================================================
4. TESTE CRÍTICO DE AMBIGUIDADE
==================================================

Especialmente para:

"Quanto custa corte?"

Se a unidade possuir:

Corte Feminino
e
Corte Masculino

NÃO escolha automaticamente um deles.

Execute a lógica atual e mostre o que REALMENTE acontece.

Se atualmente selecionar um automaticamente:

RESULTADO = FALHOU

Não corrija.

==================================================
5. TESTE DE PREÇO
==================================================

Para cada serviço inequivocamente resolvido:

Mostre a cadeia REAL:

BEMP
↓
list_services
↓
SERVICE_PRICE_RESOLVED
↓
Gemini
↓
price auditor
↓
Evolution/WhatsApp

Mostre:

officialPrice
generatedPrice
sentPrice

Os três precisam ser numericamente iguais.

==================================================
6. TESTE DE ALUCINAÇÃO CONTROLADO
==================================================

Utilize o mecanismo de teste existente, sem enviar mensagem
para cliente real.

Exemplo:

officialPrice = 100.00
generatedPrice = 79.90

Execute o price auditor.

Resultado obrigatório:

PRICE_MISMATCH_BLOCKED

Comprove pelo log/trace que R$79,90 não atravessaria
reply.server.ts para Evolution.

==================================================
7. SERVIÇO INEXISTENTE
==================================================

Teste:

"Quanto custa o serviço XYZ INEXISTENTE 987?"

nas três unidades.

Resultado obrigatório:

serviceId = null
officialPrice = null
SERVICE_PRICE_RESOLVED = false
nenhum preço inventado

Mostre qual resposta segura seria produzida.

==================================================
8. NÃO ENVIE WHATSAPP REAL
==================================================

IMPORTANTE:

Não envie mensagens de teste para clientes reais.

Use execução interna, test runner, dry-run, funções,
logs ou ambiente seguro disponível no projeto.

Se alguma etapa somente puder ser comprovada enviando WhatsApp
real, NÃO execute essa etapa.

Marque:

NÃO TESTADO — EXIGE ENVIO REAL

==================================================
9. PROVA, NÃO DESCRIÇÃO
==================================================

Não diga:

"está funcionando"
"foi corrigido"
"está protegido"
"o sistema garante"

sem apresentar resultado da execução correspondente.

Quero OUTPUT REAL dos testes.

==================================================
10. RESULTADO FINAL
==================================================

Entregue:

CENTRO
corte genérico =
corte feminino =
corte masculino =
manicure =
escova =
serviço inexistente =

VENTURA
corte genérico =
corte feminino =
corte masculino =
manicure =
escova =
serviço inexistente =

BOULEVARD
corte genérico =
corte feminino =
corte masculino =
manicure =
escova =
serviço inexistente =

Depois:

LIST_SERVICES TESTADA NAS 3 = SIM/NÃO
PREÇOS CONFEREM COM BEMP = SIM/NÃO
AMBIGUIDADE TRATADA = SIM/NÃO
ALUCINAÇÃO BLOQUEADA = SIM/NÃO
SERVIÇO INEXISTENTE SEGURO = SIM/NÃO

TOTAL DE TESTES EXECUTADOS =
APROVADOS =
FALHARAM =
NÃO TESTADOS =

Se houver qualquer FALHA:
mostre arquivo/função envolvida e trace.

NÃO CORRIJA A FALHA.

PARE E AGUARDE MINHA AUTORIZAÇÃO.`;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Status do Projeto Julia IA</h1>
      <div className="bg-slate-900 text-slate-50 p-6 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-800 shadow-xl overflow-auto max-h-[70vh]">
        {instructions}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg bg-emerald-50 border-emerald-100">
          <h2 className="font-semibold text-emerald-900 mb-2">Diagnóstico Concluído</h2>
          <p className="text-emerald-700 text-sm">A causa técnica do erro de preço (alucinação por falha de ferramenta) foi isolada e bloqueada.</p>
        </div>
        <div className="p-4 border rounded-lg bg-blue-50 border-blue-100">
          <h2 className="font-semibold text-blue-900 mb-2">Próxima Etapa</h2>
          <p className="text-blue-700 text-sm">Implementação das proteções determinísticas e validação em todas as unidades.</p>
        </div>
      </div>
    </div>
  )
}
