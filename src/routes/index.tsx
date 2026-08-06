import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
const StripeEmbeddedCheckout = lazy(() =>
  import("@/components/StripeEmbeddedCheckout").then((m) => ({
    default: m.StripeEmbeddedCheckout,
  })),
);
import {
  Flower2,
  MessageCircle,
  CalendarClock,
  Sparkles,
  ShieldCheck,
  BarChart3,
  Bot,
  Check,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Seja Livre AI Platform — Gestão Inteligente para Salões" },
      {
        name: "description",
        content:
          "A inteligência que administra, agenda, vende e fideliza clientes. Plataforma Inteligente para Gestão de Salões de Beleza.",
      },
      { property: "og:title", content: "Seja Livre AI Platform — Inteligência Artificial no WhatsApp" },
      {
        property: "og:description",
        content:
          "Julia AI atende, agenda, confirma e faz cross-sell no WhatsApp da sua clínica ou salão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

import { PLAN_METADATA, PLANS as CENTRAL_PLANS, type PlanKey, type Cycle } from "@/lib/plans";

function LandingPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<null | { email?: string }>(null);
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);

  useEffect(() => {
    // Retoma o destino pretendido salvo antes do login social (redirect_uri é a origem pública).
    const resumeNext = () => {
      try {
        const stored = localStorage.getItem("auth:next");
        if (!stored) return false;
        localStorage.removeItem("auth:next");
        if (!stored.startsWith("/") || stored.startsWith("//") || stored === "/") return false;
        window.location.replace(stored);
        return true;
      } catch {
        return false;
      }
    };
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        if (resumeNext()) return;
        setSession({ email: data.user.email ?? undefined });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (s && resumeNext()) return;
      setSession(s ? { email: s.user.email ?? undefined } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);


  function handleSubscribe(priceId: string) {
    if (!session) {
      navigate({
        to: "/auth",
        search: { next: `/?assinar=${priceId}` },
      });
      return;
    }
    setSelectedPrice(priceId);
    setTimeout(() => {
      document
        .getElementById("checkout-section")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  // Auto-open checkout after login redirect back with ?assinar=
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const auto = params.get("assinar");
    if (auto) {
      setSelectedPrice(auto);
      setTimeout(
        () =>
          document
            .getElementById("checkout-section")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [session]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* 
        Execute esta instrucao no projeto: IMPLEMENTAÇÃO COMPLETA — FOLLOW-UP AUTÔNOMO PELA IA

        OBJETIVO

Fazer a Julia AI executar integralmente as tarefas de follow-up das clientes que não concluíram o agendamento.

A IA deve:

- detectar abandono;
- identificar onde a cliente parou;
- descobrir o motivo provável;
- programar a abordagem;
- gerar uma mensagem personalizada;
- validar se o contato ainda deve acontecer;
- enviar pelo WhatsApp;
- acompanhar a resposta;
- continuar o agendamento;
- cancelar follow-ups desnecessários;
- registrar o resultado;
- encaminhar para humano quando necessário.

Não criar campanhas em massa dentro deste módulo.

Não enviar spam.

Não alterar regras de agendamento do BEMP.

Não publicar automaticamente.

==================================================
1. RESPONSABILIDADES DA IA
==================================================

A Julia AI deve executar estas tarefas:

1. Identificar conversas com agendamento incompleto.
2. Determinar o estágio exato do funil.
3. Identificar o motivo do abandono.
4. Calcular se um follow-up é apropriado.
5. Definir data e horário de envio.
6. Gerar a mensagem adequada ao contexto.
7. Verificar novamente as condições antes do envio.
8. Enviar uma única mensagem.
9. Interpretar a resposta da cliente.
10. Retomar o agendamento do ponto correto.
11. Atualizar o CRM e o pipeline.
12. Encerrar, cancelar ou reagendar o follow-up.
13. Registrar conversão, recusa ou ausência de resposta.
14. Respeitar opt-out e atendimento humano.

==================================================
2. NÃO DEIXAR A IA CONTROLAR A INFRAESTRUTURA
==================================================

A IA decide:

- intenção;
- mensagem;
- próxima ação;
- motivo;
- prioridade.

O backend controla:

- horários;
- limites;
- idempotência;
- permissões;
- envio;
- locks;
- persistência;
- opt-out;
- regras legais;
- validações do BEMP.

A IA nunca pode:

- executar envios ilimitados;
- alterar scheduled_at diretamente sem validação;
- ignorar opt-out;
- enviar fora do horário permitido;
- confirmar agendamento sem o BEMP;
- inventar horários, preços ou profissionais;
- enviar várias mensagens para a mesma tentativa.

==================================================
3. ESTÁGIOS DO FUNIL
==================================================

Padronizar os estágios:

NEW_CONTACT
IDENTIFYING_SERVICE
SERVICE_SELECTED
SELECTING_UNIT
SELECTING_PROFESSIONAL
SELECTING_DATE
SELECTING_TIME
AWAITING_CONFIRMATION
BOOKED
HUMAN_HANDOFF
ABANDONED
CANCELED
COMPLETED

Usar valores técnicos padronizados no banco.

Mostrar traduções em português somente na interface.

A IA deve receber o estágio atual como contexto confiável.

==================================================
4. MOTIVOS DO ABANDONO
==================================================

Criar enum:

NO_REPLY
NO_AVAILABLE_SLOT
PROFESSIONAL_UNAVAILABLE
PRICE_CONCERN
PLAN_VALIDATION_PENDING
CPF_NOT_PROVIDED
UNIT_TRANSFER_PENDING
SERVICE_UNAVAILABLE
WAITING_CONFIRMATION
CUSTOMER_UNDECIDED
TECHNICAL_FAILURE
UNKNOWN

A IA pode sugerir o motivo.

O backend deve validar com base em:

- última tool executada;
- último erro;
- estágio;
- histórico;
- disponibilidade;
- estado do BEMP;
- resposta da cliente.

Não usar apenas inferência livre.

==================================================
5. TABELA DE FOLLOW-UPS
==================================================

Reutilizar crm_followups, se já existir.

Garantir campos equivalentes a:

id
organization_id
conversation_id
customer_id
unit_id
source_message_id
pipeline_stage
reason
priority
status
attempt
max_attempts
scheduled_at
last_validated_at
sent_at
responded_at
completed_at
canceled_at
cancel_reason
generated_message
response_message_id
conversion_type
metadata
created_at
updated_at

Status:

PENDING
VALIDATING
READY
SENDING
SENT
RESPONDED
COMPLETED
CANCELED
FAILED
EXPIRED
PAUSED

Não criar nova tabela se a atual puder ser migrada com segurança.

==================================================
6. DETECÇÃO DO ABANDONO
==================================================

Criar ou consolidar:

detectFollowupCandidates()

Ela deve localizar conversas que:

- possuem intenção real de agendamento;
- ainda não possuem agendamento confirmado;
- aguardam resposta da cliente;
- não estão em atendimento humano;
- não estão canceladas;
- não possuem opt-out;
- não possuem follow-up ativo equivalente;
- estão dentro da janela permitida.

Não criar follow-up para todo contato que apenas fez uma pergunta.

==================================================
7. REGRAS INICIAIS DE TEMPO
==================================================

Aplicar regras configuráveis:

SERVICE_SELECTED sem resposta:
30 minutos

SELECTING_PROFESSIONAL sem resposta:
45 minutos

SELECTING_DATE sem resposta:
45 minutos

SELECTING_TIME sem resposta:
30 minutos

AWAITING_CONFIRMATION sem resposta:
20 minutos

NO_AVAILABLE_SLOT:
reavaliar quando surgir nova disponibilidade

PROFESSIONAL_UNAVAILABLE:
reavaliar quando surgir vaga com a profissional

PLAN_VALIDATION_PENDING:
2 horas, quando estiver aguardando CPF ou validação

Segundo follow-up:
no mínimo 12 horas após o primeiro

Terceiro follow-up:
no mínimo 24 horas após o segundo

Máximo:
3 tentativas por jornada de agendamento

Tornar os intervalos configuráveis no backend.

==================================================
8. HORÁRIOS PERMITIDOS
==================================================

Não enviar automaticamente fora do período:

09:00 às 20:00

Usar:

America/Sao_Paulo

Se scheduled_at cair fora do período:

mover para o próximo horário permitido.

Não enviar follow-up de madrugada.

Criar configuração por organização no futuro, mas usar esse padrão inicialmente.

==================================================
9. PLANEJADOR DA IA
==================================================

Criar serviço:

FollowupAIPlanner

Entrada estruturada:

{
  customer: {
    preferredName,
    phoneMasked,
    memorySummary
  },
  conversation: {
    id,
    stage,
    lastCustomerMessage,
    lastAssistantMessage,
    lastInteractionAt
  },
  booking: {
    serviceName,
    professionalName,
    preferredDate,
    preferredTime,
    unitName,
    planName
  },
  abandonment: {
    reason,
    evidence
  },
  followup: {
    attempt,
    maxAttempts
  }
}

Retorno obrigatório validado por Zod:

{
  shouldSend: boolean,
  reason: string,
  priority: number,
  recommendedDelayMinutes: number,
  message: string,
  nextAction:
    | "RESUME_BOOKING"
    | "CHECK_NEW_SLOTS"
    | "OFFER_OTHER_PROFESSIONAL"
    | "REQUEST_CONFIRMATION"
    | "REQUEST_CPF"
    | "HANDOFF_HUMAN"
    | "CLOSE"
}

A IA não pode retornar SQL, IDs técnicos ou comandos arbitrários.

==================================================
10. GERAÇÃO DA MENSAGEM
==================================================

A mensagem deve:

- usar o nome quando confirmado;
- citar o serviço quando conhecido;
- citar profissional somente quando relevante;
- citar unidade atual da conversa;
- ser curta;
- parecer humana;
- fazer uma única pergunta;
- não pressionar;
- preservar formatação do WhatsApp;
- não prometer vaga sem consultar o BEMP.

Não usar blocos longos.

Não usar Markdown com dois asteriscos.

Usar:

*texto*

para destaque no WhatsApp.

==================================================
11. EXEMPLOS POR MOTIVO
==================================================

NO_REPLY:

“Oi, *{{nome}}*! 💜

Vi que seu agendamento de *{{serviço}}* ficou incompleto.

Posso continuar de onde paramos?”

WAITING_CONFIRMATION:

“Oi, *{{nome}}*! 😊

Faltou apenas confirmar seu horário de *{{serviço}}*.

Deseja que eu continue com a reserva?”

PROFESSIONAL_UNAVAILABLE:

“Oi, *{{nome}}*! 💜

Você estava procurando um horário com *{{profissional}}*.

Posso verificar novas disponibilidades ou procurar outra profissional para você?”

NO_AVAILABLE_SLOT:

“Oi, *{{nome}}*! ✨

Posso verificar novamente os horários de *{{serviço}}* na unidade *{{unidade}}*.

Quer que eu consulte?”

PLAN_VALIDATION_PENDING:

“Oi, *{{nome}}*! 💜

Para continuar o agendamento pelo seu plano, ainda preciso validar seu CPF.

Deseja continuar?”

CPF deve ser solicitado somente quando necessário.

Nunca incluir CPF existente na mensagem.

==================================================
12. VALIDAÇÃO ANTES DO ENVIO
==================================================

Imediatamente antes de enviar, executar:

validateFollowupBeforeSend()

Verificar:

- cliente respondeu depois da criação;
- agendamento já foi concluído;
- conversa foi cancelada;
- humano assumiu;
- IA está pausada;
- agente está conectado;
- unidade existe;
- opt-out;
- limite de tentativas;
- follow-up duplicado;
- horário permitido;
- conversa ainda está no estágio correspondente;
- outra ação já resolveu o problema.

Se qualquer condição invalidar:

status = CANCELED

Registrar cancel_reason.

Não enviar.

==================================================
13. ENVIO
==================================================

Somente FollowupOrchestrator pode chamar:

EvolutionService.sendText()

A tool de IA não deve enviar diretamente.

Fluxo:

PENDING
→ VALIDATING
→ READY
→ SENDING
→ SENT

Após sucesso:

- salvar messageId da Evolution;
- adicionar mensagem assistant/system ao histórico;
- atualizar last_followup_at;
- incrementar attempts;
- registrar auditoria.

Após falha:

- status FAILED;
- salvar erro estruturado;
- permitir retentativa apenas para erros transitórios;
- não duplicar envio.

==================================================
14. IDEMPOTÊNCIA
==================================================

Criar chave única:

conversation_id
+
pipeline_stage
+
attempt
+
followup_journey_id

Um follow-up não pode ser enviado duas vezes.

Também criar send id:

followup:${followupId}:attempt:${attempt}

Se já estiver SENT:

não reenviar.

==================================================
15. LOCK
==================================================

Criar lock por followup_id durante:

- validação;
- geração;
- envio;
- atualização final.

O lock deve:

- possuir expiração;
- ser liberado em finally;
- permitir recuperação de lock abandonado;
- impedir dois workers de enviarem a mesma mensagem.

==================================================
16. RESPOSTA DA CLIENTE
==================================================

Quando uma nova mensagem chegar, verificar se existe follow-up SENT ativo para a conversa.

Se existir:

- marcar RESPONDED;
- cancelar follow-ups futuros daquela jornada;
- enviar a mensagem ao orquestrador normal da IA;
- incluir o estágio e a intenção do follow-up no contexto;
- continuar do ponto correto.

Não iniciar uma nova saudação.

Não perguntar novamente nome, telefone, unidade ou serviço já conhecidos.

==================================================
17. RETOMADA DO AGENDAMENTO
==================================================

Se a cliente responder:

“Sim”
“Pode continuar”
“Quero”
“Veja os horários”
“Tem com a Juliana?”

A IA deve retomar conforme nextAction.

Exemplos:

RESUME_BOOKING:
continuar no estágio salvo.

CHECK_NEW_SLOTS:
consultar BEMP novamente.

OFFER_OTHER_PROFESSIONAL:
listar somente profissionais válidos da unidade atual.

REQUEST_CONFIRMATION:
mostrar resumo atualizado e pedir confirmação.

REQUEST_CPF:
solicitar CPF e validar no BEMP.

Nenhuma disponibilidade antiga pode ser reutilizada sem nova consulta quando já tiver expirado.

==================================================
18. NOVA DISPONIBILIDADE
==================================================

Para motivos:

NO_AVAILABLE_SLOT
PROFESSIONAL_UNAVAILABLE

criar follow-up orientado a evento.

Quando surgir nova vaga:

1. identificar clientes compatíveis;
2. ordenar por score;
3. criar oportunidade;
4. validar novamente;
5. oferecer para uma cliente por vez;
6. aguardar resposta;
7. somente passar à próxima após recusa ou expiração.

Não oferecer o mesmo horário simultaneamente para várias clientes.

==================================================
19. CONCLUSÃO
==================================================

Quando o agendamento for criado:

- marcar follow-ups ativos como COMPLETED;
- conversion_type = BOOKING_COMPLETED;
- registrar appointmentId;
- cancelar tentativas futuras;
- atualizar pipeline para BOOKED;
- registrar receita estimada separadamente de receita realizada.

==================================================
20. RECUSA
==================================================

Se a cliente disser:

“Não quero”
“Não tenho interesse”
“Pare de mandar mensagem”
“Não me chame mais”

Diferenciar:

recusa desta jornada
versus
opt-out permanente.

Recusa da jornada:

- encerrar follow-ups desse agendamento;
- manter comunicações permitidas futuras conforme regras.

Opt-out:

- registrar DO_NOT_CONTACT;
- cancelar todos os follow-ups pendentes;
- não enviar novas abordagens automáticas.

Responder brevemente confirmando.

==================================================
21. ATENDIMENTO HUMANO
==================================================

Se houver:

human_handoff ativo
assigned_operator
conversa manual em andamento

A IA não envia follow-up.

Se a IA detectar:

- reclamação;
- cobrança;
- conflito;
- erro persistente;
- pedido explícito de pessoa;
- baixa confiança;

nextAction = HANDOFF_HUMAN

Criar tarefa para equipe.

==================================================
22. PLANO BEAUTY
==================================================

Quando o follow-up for sobre plano:

- não afirmar que o plano está ativo com base em memória;
- solicitar CPF quando necessário;
- consultar BEMP;
- validar status e saldo;
- mapear o serviço correto.

Mapeamento:

Plano de manicure
→ Manicure Plano Beauty

Plano de escova
→ Escova Plano Beauty

Plano de hidratação e escova
→ Hidratação e Escova

Não agendar serviço comum quando o benefício válido exigir serviço específico.

==================================================
23. TRANSFERÊNCIA DE UNIDADE
==================================================

Follow-up deve usar a unidade atual da conversa:

wa_conversas.unidade_id

Fallback:

wa_agentes.unidade_id

Se a conversa foi transferida:

- manter a unidade transferida;
- resolver novamente serviço e profissionais;
- não voltar à unidade padrão do agente.

==================================================
24. MEMÓRIA
==================================================

Usar memória confirmada para personalizar:

- nome preferido;
- serviço;
- profissional;
- dia;
- faixa de horário.

Não tratar inferência como certeza.

Dados atuais do BEMP prevalecem.

Não salvar ausência de resposta como preferência.

==================================================
25. PAINEL DE FOLLOW-UP
==================================================

Na interface mostrar:

- cliente;
- unidade;
- serviço;
- estágio;
- motivo;
- tentativa;
- próxima ação;
- scheduled_at;
- mensagem gerada;
- status;
- resultado;
- conversão;
- responsável;
- logs resumidos.

Ações administrativas:

- enviar agora;
- pausar;
- cancelar;
- editar horário;
- transferir para humano;
- visualizar conversa.

Toda ação deve ser validada no backend.

==================================================
26. MODO AUTÔNOMO
==================================================

Adicionar configuração:

FOLLOWUP_AUTONOMY_MODE

Valores:

OFF
SUGGEST_ONLY
APPROVAL_REQUIRED
AUTONOMOUS

Comportamento:

OFF:
não gerar.

SUGGEST_ONLY:
criar sugestão sem agendar.

APPROVAL_REQUIRED:
gerar e aguardar aprovação humana.

AUTONOMOUS:
agendar e enviar automaticamente dentro das regras.

Iniciar em:

APPROVAL_REQUIRED

Somente permitir AUTONOMOUS depois dos testes e autorização administrativa.

Configuração por organização/unidade.

==================================================
27. JOBS
==================================================

Criar jobs separados:

followup_candidate_detector
followup_planner
followup_sender
followup_expiration
followup_response_reconciler
followup_metrics

Cada job deve possuir:

- lock;
- idempotência;
- timeout;
- resultado;
- log;
- status;
- processedCount;
- failedCount.

Não executar tudo em uma única requisição longa.

==================================================
28. MÉTRICAS
==================================================

Registrar:

followups_created
followups_approved
followups_sent
followups_canceled
followups_failed
followups_responded
followups_converted
followups_opt_out
average_response_time
conversion_rate
conversion_by_reason
conversion_by_stage
conversion_by_unit

Diferenciar:

agendamento recuperado
receita estimada
receita realizada

==================================================
29. LOGS
==================================================

Registrar:

followup_candidate_detected
followup_plan_started
followup_plan_completed
followup_validation_started
followup_validation_canceled
followup_send_started
followup_send_completed
followup_send_failed
followup_response_detected
followup_booking_resumed
followup_completed
followup_opt_out

Mascarar telefone e CPF.

Não registrar prompts completos.

==================================================
30. TESTES
==================================================

Teste 1 — serviço escolhido sem resposta

Após 30 minutos:
follow-up criado.

Teste 2 — cliente responde antes do envio

follow-up cancelado.

Teste 3 — horário já confirmado

nenhum envio.

Teste 4 — atendimento humano

nenhum envio.

Teste 5 — opt-out

todos os follow-ups cancelados.

Teste 6 — mensagem duplicada

um único envio.

Teste 7 — erro Evolution

status FAILED e retentativa controlada.

Teste 8 — resposta “Sim”

retomar no estágio correto.

Teste 9 — vaga expirou

consultar BEMP novamente.

Teste 10 — conversa transferida

usar unidade transferida.

Teste 11 — plano

solicitar CPF, validar BEMP e usar serviço correto.

Teste 12 — três tentativas

encerrar jornada.

Teste 13 — horário noturno

reagendar para o próximo período permitido.

Teste 14 — modo APPROVAL_REQUIRED

não enviar antes da aprovação.

Teste 15 — modo AUTONOMOUS

enviar somente após todas as validações.

==================================================
31. IMPLANTAÇÃO SEGURA
==================================================

Ativar em fases:

FASE 1:
SUGGEST_ONLY

FASE 2:
APPROVAL_REQUIRED para uma unidade de teste

FASE 3:
AUTONOMOUS para pequena amostra

FASE 4:
expansão gradual

Adicionar feature flag e rollback imediato.

Não habilitar AUTONOMOUS globalmente durante a implementação.

==================================================
32. ENTREGA
==================================================

Ao concluir informar:

1. serviços criados;
2. jobs criados;
3. tabela/migrations alteradas;
4. schemas;
5. regras de tempo;
6. validações pré-envio;
7. mecanismo de opt-out;
8. idempotência;
9. locks;
10. retomada do agendamento;
11. integração BEMP;
12. integração Evolution;
13. painel;
14. métricas;
15. testes;
16. build;
17. typecheck;
18. lint;
19. plano de ativação;
20. rollback.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

O módulo só estará concluído quando a IA conseguir detectar uma conversa abandonada, criar um follow-up adequado, validar as condições, enviar uma única mensagem, interpretar a resposta e retomar o agendamento no estágio correto.
      </div>
      <div className="bg-green-600 text-white p-2 text-center text-xs font-medium">
        Sistema otimizado: cache de permissões e credenciais ativado para maior velocidade.
      </div>
      <PaymentTestModeBanner />

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
              <Flower2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-display text-lg leading-none">Seja Livre</p>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                AI Platform
              </p>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground">
              Recursos
            </a>
            <a href="#planos" className="text-muted-foreground hover:text-foreground">
              Planos
            </a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2">
            {session ? (
              <Button asChild variant="default" size="sm">
                <Link to="/painel">Ir para o painel</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/auth" search={{ next: "/painel" }}>Entrar</Link>
                </Button>
                <Button asChild size="sm">
                  <a href="#planos">Assinar</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <div className="max-w-3xl">
            <Badge variant="secondary" className="mb-4">
              IA humanizada • 24h no WhatsApp
            </Badge>
            <h1 className="font-display text-4xl leading-tight sm:text-7xl">
              Seja Livre AI Platform
            </h1>
            <h2 className="mt-4 text-2xl font-display text-primary italic">
              "A inteligência que administra, agenda, vende e fideliza clientes."
            </h2>
            <p className="mt-6 text-xl text-muted-foreground">
              Plataforma Inteligente para Gestão de Salões de Beleza. 
              Julia AI responde seus clientes 24 horas, marca no sistema Bemp,
              confirma agendamento e faz cross-sell automático.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#planos">Ver planos</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#recursos">Como funciona</a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Sem trial. Cancele quando quiser pelo portal do cliente.
            </p>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section id="recursos" className="border-t border-border/60 bg-card/30 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="font-display text-3xl sm:text-4xl">
            Tudo o que sua recepção precisa, automatizado.
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                title: "WhatsApp com IA humanizada",
                text: "Atende texto e áudio, entende contexto e nunca soa robótico. Escala como se fossem 5 recepcionistas.",
              },
              {
                icon: CalendarClock,
                title: "Agenda integrada (Bemp)",
                text: "Consulta serviços, profissionais, horários e cria o agendamento direto no seu sistema.",
              },
              {
                icon: Sparkles,
                title: "Cross-sell configurável",
                text: "Ao final de cada agendamento, oferece serviços complementares com regras que você define.",
              },
              {
                icon: Bot,
                title: "Confirmações e lembretes",
                text: "Envia confirmação imediata e lembrete 24h antes automaticamente pelo WhatsApp.",
              },
              {
                icon: ShieldCheck,
                title: "Handoff humano quando precisa",
                text: "Casos delicados são encaminhados aos seus operadores com contexto completo da conversa.",
              },
              {
                icon: BarChart3,
                title: "Painel em tempo real",
                text: "Veja leads, atendimentos, sugestões e auditoria de tudo o que a IA fez.",
              },
            ].map((f) => (
              <Card key={f.title} className="border-border/60">
                <CardHeader>
                  <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {f.text}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-20">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl sm:text-4xl">Escolha seu plano</h2>
            <p className="mt-3 text-muted-foreground">
              Preços em reais, com impostos calculados automaticamente.
            </p>
            <div className="mt-6 inline-flex rounded-full border border-border p-1">
              <button
                onClick={() => setCycle("monthly")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  cycle === "monthly"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setCycle("yearly")}
                className={`rounded-full px-4 py-1.5 text-sm transition ${
                  cycle === "yearly"
                    ? "bg-foreground text-background"
                    : "text-muted-foreground"
                }`}
              >
                Anual · 2 meses grátis
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {CENTRAL_PLANS.filter((p) => p.cycle === cycle).map((plan) => {
              return (
                <Card
                  key={plan.id}
                  className={`flex flex-col ${
                    plan.highlight
                      ? "border-primary shadow-lg ring-2 ring-primary/40"
                      : "border-border/60"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl">{plan.name}</CardTitle>
                      {plan.highlight && <Badge>Mais escolhido</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                    <div className="mt-4">
                      <div className="flex items-baseline gap-1">
                        <span className="font-display text-4xl">{plan.priceLabel}</span>
                        <span className="text-sm text-muted-foreground">
                          /{cycle === "monthly" ? "mês" : "ano"}
                        </span>
                      </div>
                      {plan.cycle === "yearly" && (
                         <p className="text-xs text-muted-foreground">≈ R$ {Math.round(parseInt(plan.priceLabel.replace(/\D/g, '')) / 12)}/mês</p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col justify-between gap-6">
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={plan.highlight ? "default" : "outline"}
                      onClick={() => handleSubscribe(plan.id)}
                    >
                      Assinar {plan.name}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Checkout */}
      {selectedPrice && (
        <section id="checkout-section" className="border-t border-border/60 bg-card/30 py-16">
          <div className="mx-auto max-w-3xl px-4">
            <h2 className="mb-6 font-display text-2xl">Finalizar assinatura</h2>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">Carregando checkout…</div>}>
                  <StripeEmbeddedCheckout priceId={selectedPrice} />
                </Suspense>
              </CardContent>
            </Card>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Em ambiente de teste use o cartão 4242 4242 4242 4242 com qualquer
              CVV e data futura.
            </p>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="mx-auto max-w-3xl px-4">
          <h2 className="mb-8 font-display text-3xl">Perguntas frequentes</h2>
          <div className="space-y-6">
            {[
              {
                q: "Preciso de conta no Bemp?",
                a: "Sim — a Julia se conecta ao seu Bemp para consultar agenda e criar agendamentos reais.",
              },
              {
                q: "Como cancelo?",
                a: "A qualquer momento, direto pelo portal do cliente dentro do seu painel. Você mantém acesso até o fim do período pago.",
              },
              {
                q: "Preciso configurar o WhatsApp?",
                a: "Sim. Após assinar, guiamos você para conectar o WhatsApp Cloud API da Meta ao seu número.",
              },
              {
                q: "Como funciona a nota fiscal?",
                a: "O Stripe calcula e coleta os impostos aplicáveis no checkout. A emissão da nota fiscal fica a cargo do prestador.",
              },
            ].map((item) => (
              <div key={item.q} className="border-b border-border/60 pb-6">
                <h3 className="font-medium">{item.q}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Seja Livre AI Platform · Julia AI
      </footer>
    </div>
  );
}
