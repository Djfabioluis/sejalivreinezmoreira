import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Index,
});

function Index() {
  return (
    <div className="p-8 font-sans leading-relaxed whitespace-pre-wrap">
      Execute esta instrucao no projeto: CORRIJA SOMENTE A SAUDAÇÃO E O RESET DE CONTEXTO.

Problema real:
quando o cliente envia "oi", "olá", "bom dia", "boa tarde" ou "boa noite",
a Julia está reutilizando contexto antigo de agendamento e pulando direto
para profissional/data/horário.

REGRA CORRETA:

1. Se receber uma saudação e NÃO existir agendamento ativo aguardando resposta:
limpar contexto antigo de booking:
- serviço antigo
- profissional antigo
- data
- período
- slots
- horário
- confirmação pendente

2. Depois responder com apresentação:

"Olá! 💜 Eu sou a Julia, assistente virtual da Seja Livre.
Estou aqui para te ajudar com serviços, valores e agendamentos.
Como posso te ajudar hoje?"

3. NÃO perguntar profissional antes de saber o serviço desejado.

Fluxo correto:

Olá
→ apresentação da Julia
→ cliente informa necessidade
→ identificar serviço
→ profissional
→ data
→ período/horário
→ confirmação

4. Se existir um fluxo REAL e recente aguardando resposta,
não resetar somente porque o cliente escreveu "oi".

5. Não alterar:
- Evolution
- outbound
- idempotência
- BEMP
- preços
- criação de agendamento

Testar:

conversa com contexto antigo + "Olá"
→ contexto antigo limpo
→ Julia se apresenta

nova conversa + "Oi"
→ Julia se apresenta

fluxo ativo aguardando confirmação + "Oi"
→ preservar fluxo

Responder:

GREETING_DETECTED =
STALE_BOOKING_CONTEXT_RESET =
JULIA_INTRO_SENT =
SERVICE_BEFORE_PROFESSIONAL =
ACTIVE_FLOW_PRESERVED =
TYPECHECK_PASS =
TESTS_PASS =
BUILD_PASS =
READY_TO_DEPLOY =

PARE.
    </div>
  );
}
