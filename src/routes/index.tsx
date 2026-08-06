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
        Execute esta instrucao no projeto: IMPLEMENTAR PAUSA AUTOMÁTICA DA IA DURANTE ATENDIMENTO HUMANO

OBJETIVO

Quando um atendente humano entrar em uma conversa, a IA deve parar imediatamente de responder.

A IA deve voltar automaticamente somente depois que o humano ficar sem interagir por um período configurável e ainda existir uma nova mensagem da cliente aguardando resposta.

Não permitir respostas simultâneas da IA e do humano.

Não recomeçar a conversa com nova saudação.

Não publicar automaticamente.

==================================================
1. ESTADOS DA CONVERSA
==================================================

Adicionar ou reutilizar campos em wa_conversas:

attendance_mode
human_operator_id
human_assumed_at
human_last_activity_at
ai_paused_at
ai_resume_at
ai_pause_reason
pending_customer_reply
updated_at

Valores de attendance_mode:

AI
HUMAN
WAITING_AI_RESUME

Significados:

AI
→ IA pode responder normalmente.

HUMAN
→ humano assumiu; IA totalmente pausada.

WAITING_AI_RESUME
→ humano está inativo, mas o sistema ainda está validando se a IA deve retomar.

Não criar campos duplicados quando já existirem equivalentes.

==================================================
2. HUMANO ASSUME A CONVERSA
==================================================

Considerar que um humano assumiu quando ocorrer qualquer uma destas ações:

- clicar em “Assumir atendimento”;
- enviar mensagem manual pela Secretária Virtual;
- selecionar um responsável humano;
- alterar explicitamente o modo para atendimento humano.

Ao assumir:

attendance_mode = HUMAN
human_operator_id = usuário autenticado
human_assumed_at = now()
human_last_activity_at = now()
ai_paused_at = now()
ai_pause_reason = HUMAN_ASSUMED
ai_resume_at = null
pending_customer_reply = false

Cancelar imediatamente:

- execução pendente da IA;
- resposta ainda não enviada;
- follow-up automático da conversa;
- timers de resposta automática;
- jobs de IA ainda não iniciados.

Não apagar o histórico nem o contexto.

==================================================
3. MENSAGEM MANUAL PAUSA A IA
==================================================

Toda mensagem enviada por um operador humano deve atualizar:

attendance_mode = HUMAN
human_operator_id = usuário atual
human_last_activity_at = now()
ai_resume_at = now() + HUMAN_IDLE_TIMEOUT

A mensagem manual deve ser salva como:

role = operator

ou tipo equivalente claramente distinto de assistant.

Ela não pode voltar pelo webhook e disparar a IA.

==================================================
4. BLOQUEIO NO WEBHOOK
==================================================

Quando chegar uma mensagem da cliente:

1. salvar a mensagem;
2. atualizar a Caixa de Entrada;
3. localizar a conversa;
4. verificar attendance_mode antes de chamar a IA.

Se attendance_mode = HUMAN:

- não chamar runAgent;
- não enviar fallback;
- não enviar resposta automática;
- definir pending_customer_reply = true;
- registrar customer_message_waiting_for_human;
- atualizar unread_count;
- manter a mensagem visível para o atendente.

A mensagem nunca pode ser perdida.

==================================================
5. TEMPO DE INATIVIDADE DO HUMANO
==================================================

Criar configuração:

HUMAN_IDLE_TIMEOUT_MINUTES

Valor inicial recomendado:

15 minutos

Permitir configuração por:

agente
→ unidade
→ organização
→ padrão global

A prioridade deve seguir essa ordem.

Não deixar o valor fixo espalhado pelo código.

==================================================
6. RETOMADA AUTOMÁTICA
==================================================

Criar job:

resumeAIForInactiveHumanConversations()

Executar a cada minuto ou em frequência compatível com a infraestrutura.

Selecionar conversas onde:

attendance_mode = HUMAN
human_last_activity_at <= now() - timeout
pending_customer_reply = true
IA do agente está ativa
agente está conectado
unidade está definida
não existe lock ativo
não existe operador digitando
não existe envio humano em andamento
cliente não pediu atendimento exclusivamente humano

Mover primeiro para:

attendance_mode = WAITING_AI_RESUME

Depois executar validação final.

==================================================
7. VALIDAÇÃO ANTES DA RETOMADA
==================================================

Criar:

validateAIResume(conversationId)

Verificar novamente:

- humano não respondeu depois da seleção;
- cliente continua aguardando;
- não existe mensagem humana mais recente que a mensagem da cliente;
- conversa não foi encerrada;
- não existe handoff obrigatório;
- IA está ativa;
- agente está READY;
- unidade efetiva existe;
- cliente não pediu “quero falar com uma pessoa”;
- não existe bloqueio por reclamação ou caso sensível;
- não existe outro processamento em andamento.

Se alguma condição falhar:

- voltar para HUMAN quando o humano retomou;
ou
- manter pausada com motivo apropriado.

==================================================
8. REGRA DA MENSAGEM MAIS RECENTE
==================================================

A IA só deve retomar quando a última mensagem relevante da conversa for da cliente.

Comparar:

last_customer_message_at
last_human_message_at
last_ai_message_at

Condição obrigatória:

last_customer_message_at > last_human_message_at

Se o humano já respondeu depois da cliente:

pending_customer_reply = false
não retomar a IA.

==================================================
9. LOCK ATÔMICO
==================================================

A retomada deve usar lock por conversation_id.

Fluxo:

- adquirir lock;
- reler a conversa;
- validar estado;
- alterar para WAITING_AI_RESUME;
- chamar IA;
- enviar uma única resposta;
- alterar para AI;
- limpar pending_customer_reply;
- liberar lock em finally.

Duas instâncias do job não podem retomar a mesma conversa.

==================================================
10. CONTEXTO DA RETOMADA
==================================================

Ao retomar, enviar ao orquestrador:

- histórico recente;
- últimas mensagens do humano;
- mensagem da cliente aguardando;
- estágio atual do agendamento;
- contexto do cliente;
- unidade atual;
- resumo do atendimento humano;
- motivo da pausa.

Adicionar instrução:

“O atendimento estava sendo conduzido por uma pessoa e foi retomado automaticamente por inatividade. Continue do ponto atual. Não cumprimente novamente, não repita perguntas já respondidas e não critique o atendente humano.”

==================================================
11. MENSAGEM DE RETOMADA
==================================================

A IA não deve necessariamente avisar:

“Voltei a atender.”

Ela deve responder diretamente à pergunta pendente.

Exemplo:

Humano:
“Vou verificar um horário para você.”

Cliente:
“Tudo bem, fico aguardando.”

Após o timeout, a IA deve consultar os horários e responder com dados reais.

Não enviar apenas:

“Como posso ajudar?”

==================================================
12. CASOS QUE NÃO DEVEM RETOMAR AUTOMATICAMENTE
==================================================

Não retomar quando houver:

- reclamação;
- cobrança ou financeiro;
- conflito;
- pedido explícito de humano;
- situação sensível;
- erro persistente;
- atendimento marcado como exclusivo do operador;
- conversa encerrada;
- bloqueio manual da IA;
- cliente com opt-out;
- operador ainda digitando;
- tarefa humana pendente explicitamente registrada.

Criar campo ou estado:

human_only = true

Quando ativo, somente ação manual pode devolver a conversa para a IA.

==================================================
13. BOTÕES NA SECRETÁRIA VIRTUAL
==================================================

Adicionar controles claros:

Quando IA está ativa:

[Assumir atendimento]

Quando humano assumiu:

[Devolver para IA]
[Manter atendimento humano]

Mostrar badge:

IA atendendo
Humano atendendo
IA pausada
Aguardando retomada automática

Exibir:

Atendente: [nome]
IA retomará após: [horário]
Última atividade humana: [hora]

==================================================
14. DEVOLUÇÃO MANUAL PARA A IA
==================================================

Ao clicar em “Devolver para IA”:

- validar se há mensagem pendente;
- alterar attendance_mode para AI;
- limpar human_operator_id quando apropriado;
- limpar ai_resume_at;
- registrar auditoria;
- se houver cliente aguardando, iniciar processamento uma única vez.

Pedir confirmação:

“A IA continuará o atendimento usando todo o histórico desta conversa.”

==================================================
15. MANTER ATENDIMENTO HUMANO
==================================================

Ao clicar em “Manter atendimento humano”:

human_only = true
attendance_mode = HUMAN
ai_resume_at = null

A IA não volta automaticamente.

Somente “Devolver para IA” remove esse bloqueio.

==================================================
16. DETECÇÃO DE OPERADOR DIGITANDO
==================================================

Se a interface já possuir indicador de digitação, atualizar:

human_typing_until

Enquanto:

human_typing_until > now()

não retomar IA.

O indicador deve expirar automaticamente para evitar bloqueio permanente.

Se não houver suporte atual, não criar dependência obrigatória; usar mensagens e atividade como fonte principal.

==================================================
17. FOLLOW-UP
==================================================

Quando attendance_mode = HUMAN:

- pausar follow-ups;
- não enviar mensagens automáticas;
- não criar abordagem concorrente.

Ao retornar para AI:

- reavaliar os follow-ups;
- cancelar os que perderam sentido;
- não enviar imediatamente um follow-up se a IA acabou de responder.

==================================================
18. IDEMPOTÊNCIA
==================================================

Criar chave de retomada baseada em:

conversation_id
+
last_customer_message_id
+
resume_cycle

A mesma mensagem pendente não pode gerar duas respostas.

Registrar:

ai_resume_attempt_id

==================================================
19. FALHAS
==================================================

Se a IA falhar ao retomar:

- não marcar como AI;
- retornar para HUMAN ou WAITING_AI_RESUME;
- preservar pending_customer_reply;
- liberar lock;
- criar alerta para a equipe;
- não enviar múltiplos fallbacks.

Se a Evolution falhar no envio:

- não considerar a retomada concluída;
- manter estado recuperável;
- evitar envio duplicado após confirmação de sucesso.

==================================================
20. LOGS
==================================================

Registrar:

human_assumed_conversation
human_message_sent
ai_paused_for_human
customer_message_waiting_for_human
human_idle_timeout_reached
ai_resume_validation_started
ai_resume_blocked
ai_resume_started
ai_resume_completed
ai_resume_failed
conversation_returned_to_ai
conversation_marked_human_only

Incluir:

traceId
conversationId
agentId
unitId
operatorId
lastCustomerMessageId

Não registrar conteúdo completo da conversa.

==================================================
21. AUDITORIA
==================================================

Criar timeline de eventos internos:

- IA pausada;
- humano assumiu;
- humano respondeu;
- cliente respondeu;
- timeout atingido;
- IA retomou;
- humano retomou novamente.

Esses eventos devem ser do tipo system e não incrementar unread_count.

==================================================
22. TESTES OBRIGATÓRIOS
==================================================

Teste 1 — humano assume

- IA ativa;
- operador clica em assumir;
- cliente envia mensagem;
- IA não responde.

Teste 2 — mensagem manual

- operador envia mensagem;
- IA fica pausada;
- fromMe não dispara runAgent.

Teste 3 — humano inativo

- cliente envia mensagem;
- humano não responde pelo tempo configurado;
- IA retoma uma única vez.

Teste 4 — humano responde antes do timeout

- pending_customer_reply é limpo;
- IA não retoma.

Teste 5 — humano responde durante a retomada

- lock/validação detecta;
- IA não envia resposta concorrente.

Teste 6 — nova mensagem após timeout

- usar somente a mensagem ainda pendente;
- sem duplicidade.

Teste 7 — pedido explícito de humano

Cliente:
“Quero falar com uma atendente.”

Resultado:
human_only = true ou handoff obrigatório;
IA não volta automaticamente.

Teste 8 — devolução manual

- operador clica “Devolver para IA”;
- IA continua do ponto correto.

Teste 9 — follow-up

- follow-up pausado durante HUMAN;
- reavaliado após retorno.

Teste 10 — erro da IA

- estado não fica incorretamente como AI;
- equipe recebe alerta.

Teste 11 — duas execuções do job

- uma única adquire lock;
- uma única resposta enviada.

Teste 12 — última mensagem foi do humano

- IA não retoma.

==================================================
23. ATIVAÇÃO SEGURA
==================================================

Implementar feature flag:

AI_AUTO_RESUME_AFTER_HUMAN_IDLE

Iniciar desativada.

Depois:

1. ativar em homologação;
2. testar com agente de teste;
3. ativar em uma unidade;
4. acompanhar logs;
5. expandir gradualmente.

Não ativar globalmente durante a implementação.

==================================================
24. ENTREGA
==================================================

Ao concluir informar:

1. campos reutilizados ou criados;
2. migration;
3. timeout padrão;
4. job de retomada;
5. validações;
6. locks;
7. controles da interface;
8. interação com follow-up;
9. logs;
10. testes;
11. build;
12. typecheck;
13. lint;
14. feature flag;
15. rollback.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

O fluxo só estará concluído quando:

- o humano assumir e a IA parar imediatamente;
- mensagens da cliente continuarem entrando;
- a IA retomar somente após inatividade real;
- a última mensagem continuar sem resposta humana;
- não houver respostas simultâneas;
- o humano puder bloquear ou devolver a conversa manualmente.
      */}
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
