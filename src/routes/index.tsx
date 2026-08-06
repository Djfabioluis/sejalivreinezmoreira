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
        Execute esta instrucao no projeto: CORREÇÃO CRÍTICA — IA NÃO PAUSA QUANDO O HUMANO RESPONDE

PROBLEMA

Um atendente humano começa a conversar com a cliente pela Secretária Virtual ou pelo próprio WhatsApp conectado, mas a IA continua respondendo junto.

OBJETIVO

Qualquer interação humana válida deve pausar imediatamente a IA antes de a mensagem ser enviada ou processada.

Não permitir respostas simultâneas de humano e IA.

Não depender somente do botão “Assumir atendimento”.

Não publicar automaticamente.

==================================================
1. IDENTIFICAR TODOS OS CANAIS DE RESPOSTA HUMANA
==================================================

Mapear onde um humano pode responder:

- campo de mensagem da Secretária Virtual;
- botão “Enviar”;
- respostas rápidas;
- envio de mídia;
- envio pelo WhatsApp físico conectado;
- ações administrativas que enviam mensagens;
- integração externa, se houver.

Todas essas ações devem passar por uma função única:

pauseAIForHumanInteraction()

==================================================
2. PAUSAR ANTES DO ENVIO HUMANO
==================================================

No handler de envio manual, executar nesta ordem:

1. adquirir lock da conversa;
2. marcar atendimento humano;
3. cancelar processamento pendente da IA;
4. enviar mensagem humana;
5. salvar mensagem como operator;
6. atualizar última atividade humana;
7. liberar lock.

Não enviar primeiro e pausar depois.

Exemplo:

await pauseAIForHumanInteraction({
  conversationId,
  operatorId,
  source: "SECRETARIA_VIRTUAL"
});

await sendManualMessage(...);

==================================================
3. FUNÇÃO ÚNICA DE PAUSA
==================================================

Criar ou consolidar:

pauseAIForHumanInteraction({
  conversationId,
  operatorId,
  source
})

Ela deve atualizar atomicamente:

attendance_mode = "HUMAN"
human_operator_id = operatorId
human_assumed_at = COALESCE(human_assumed_at, now())
human_last_activity_at = now()
ai_paused_at = now()
ai_pause_reason = "HUMAN_INTERACTION"
ai_resume_at = now() + timeout
pending_customer_reply = false
human_only = false, salvo configuração explícita

Também deve:

- cancelar jobs pendentes da IA para a conversa;
- cancelar follow-ups prontos para envio;
- invalidar respostas ainda não enviadas;
- registrar auditoria.

==================================================
4. NÃO DEPENDER DO FRONTEND
==================================================

A pausa deve ocorrer no backend.

Mesmo que o frontend falhe ou seja contornado, qualquer rota de envio manual deve obrigatoriamente chamar pauseAIForHumanInteraction().

Não confiar em:

setState local
botão oculto
badge visual
campo attendance_mode alterado apenas no browser

==================================================
5. MENSAGEM HUMANA SALVA COMO OPERATOR
==================================================

Mensagens manuais devem ser salvas com origem clara:

role = "operator"

ou:

sender_type = "HUMAN"

Não salvar mensagem humana como:

assistant
user
system

A IA deve conseguir distinguir:

cliente
IA
atendente humano

==================================================
6. MENSAGEM ENVIADA PELO WHATSAPP FÍSICO
==================================================

Quando o atendente responder pelo próprio aplicativo WhatsApp conectado, a Evolution provavelmente enviará:

fromMe = true

Hoje essas mensagens podem estar sendo apenas ignoradas.

Alterar o tratamento:

Se fromMe = true:

- não chamar IA;
- não salvar como mensagem do cliente;
- identificar se é mensagem humana real ou mensagem enviada pelo sistema;
- quando for humana, pausar a IA;
- salvar como operator;
- atualizar human_last_activity_at.

Não retornar imediatamente antes de atualizar o modo humano.

==================================================
7. DIFERENCIAR MENSAGEM DO SISTEMA E DO HUMANO
==================================================

Não tratar todo fromMe como humano, pois respostas da própria IA também retornam como fromMe.

Criar correlação de envios.

Quando o sistema enviar pela Evolution, registrar:

outbound_message_id
source = "AI" | "SYSTEM" | "FOLLOWUP"

Quando chegar evento fromMe:

- se messageId estiver registrado como envio da IA/sistema:
  apenas atualizar status de entrega;
  não pausar IA;

- se messageId não estiver registrado como envio do sistema:
  considerar possível envio humano;
  salvar como operator;
  pausar IA.

Esta distinção é obrigatória.

==================================================
8. BLOQUEIO ANTES DO RUNAGENT
==================================================

Imediatamente antes de chamar runAgent(), reler a conversa no banco.

Não confiar no estado carregado no início do webhook.

Verificar:

attendance_mode
human_last_activity_at
human_only
ai_paused_at

Se attendance_mode = HUMAN ou human_only = true:

- abortar runAgent;
- registrar ai_execution_blocked_by_human;
- não enviar fallback;
- preservar a mensagem da cliente.

Essa segunda verificação evita corrida:

cliente envia
→ webhook começa
→ humano responde
→ webhook antigo continua
→ IA responde

==================================================
9. CANCELAR PROCESSAMENTO EM ANDAMENTO
==================================================

Se o humano assumir enquanto a IA já está processando:

- marcar uma versão/epoch da conversa;
- antes de enviar a resposta da IA, validar novamente;
- se o modo mudou para HUMAN, cancelar o envio.

Criar:

conversation_ai_epoch

Ao iniciar IA:

capture epoch

Antes do envio:

confirmar que epoch não mudou.

Ou usar:

ai_processing_token

Se o humano assumir, invalidar o token.

==================================================
10. LOCK DE CONVERSA
==================================================

Usar o mesmo lock para:

- processamento da IA;
- envio humano;
- devolução à IA;
- retomada automática.

O envio humano deve ter prioridade.

Se existir processamento da IA:

- sinalizar cancelamento;
- aguardar ou invalidar o envio;
- nunca enviar as duas respostas.

==================================================
11. INTERFACE
==================================================

Ao abrir uma conversa e o operador começar a digitar, opcionalmente marcar atividade temporária.

Mas a pausa definitiva deve ocorrer ao:

- clicar “Assumir atendimento”;
- enviar a primeira mensagem humana.

Depois do envio, mostrar imediatamente:

“Humano atendendo”

e:

“IA pausada”

Sem precisar atualizar a página.

==================================================
12. BOTÃO ASSUMIR ATENDIMENTO
==================================================

Manter o botão, mas ele deve usar a mesma função server-side.

Não criar dois fluxos diferentes:

botão assumir
e
mensagem manual

Ambos devem chamar:

página pauseAIForHumanInteraction()

==================================================
13. FOLLOW-UP E AUTOMAÇÕES
==================================================

Quando humano assume:

- cancelar follow-up em estado READY ou SENDING ainda não enviado;
- pausar novos follow-ups;
- não gerar campanha individual para a conversa;
- não executar retomada automática antes do timeout.

Não cancelar campanhas gerais já aprovadas, salvo regra explícita.

==================================================
14. RETOMADA AUTOMÁTICA
==================================================

A retomada só pode ocorrer quando:

- último evento humano ultrapassou o timeout;
- existe mensagem da cliente sem resposta humana;
- última mensagem relevante é da cliente;
- human_only = false;
- não existe operador digitando;
- não existe job humano pendente.

Não retomar apenas porque passou o tempo.

==================================================
15. LOGS OBRIGATÓRIOS
==================================================

Registrar:

human_interaction_detected
human_pause_started
human_pause_completed
manual_message_send_started
manual_message_send_completed
from_me_matched_system_outbound
from_me_classified_as_human
ai_processing_invalidated_by_human
ai_execution_blocked_by_human
ai_send_canceled_by_human
human_activity_updated

Incluir:

traceId
conversationId
operatorId
source
messageId
attendanceModeBefore
attendanceModeAfter

Não registrar conteúdo completo.

==================================================
16. TESTE DE CORRIDA CRÍTICO
==================================================

Cenário:

1. cliente envia mensagem;
2. IA começa a processar;
3. antes da resposta, humano envia mensagem;
4. humano é salvo como operator;
5. IA tenta enviar.

Resultado obrigatório:

- mensagem humana enviada;
- resposta da IA cancelada;
- attendance_mode = HUMAN;
- apenas uma mensagem enviada à cliente.

==================================================
17. TESTES OBRIGATÓRIOS
==================================================

Teste 1 — botão assumir

IA para imediatamente.

Teste 2 — envio manual sem clicar em assumir

Primeira mensagem humana pausa IA.

Teste 3 — resposta pelo WhatsApp físico

Evento fromMe não registrado como outbound do sistema:
pausa IA.

Teste 4 — resposta da própria IA volta como fromMe

Não pausa IA.

Teste 5 — follow-up enviado pelo sistema volta como fromMe

Não classificar como humano.

Teste 6 — humano responde durante runAgent

Resposta da IA não é enviada.

Teste 7 — nova mensagem da cliente durante modo HUMAN

Mensagem entra na caixa;
IA não responde.

Teste 8 — dois operadores

Última atividade é atualizada;
não criar dois processamentos.

Teste 9 — falha ao pausar

Não enviar mensagem humana como se a pausa tivesse funcionado silenciosamente;
mostrar erro e impedir risco de resposta concorrente.

Teste 10 — retomada após timeout

Somente retomar quando cliente continua aguardando.

==================================================
18. AUDITORIA DO CÓDIGO EXISTENTE
==================================================

Localizar todas as chamadas a:

sendEvolutionText
sendManualMessage
sendMessage
runAgent
runAgentWithLogging
processMessagesUpsert

Confirmar que:

- todo envio humano pausa IA;
- todo runAgent verifica modo humano;
- todo envio da IA verifica novamente antes de sair.

==================================================
19. ENTREGA
==================================================

Ao concluir informar:

1. causa raiz;
2. onde o envio humano não pausava;
3. como fromMe é diferenciado;
4. como processamento da IA é invalidado;
5. arquivos alterados;
6. migrations;
7. logs do teste de corrida;
8. build;
9. typecheck;
10. lint;
11. testes.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

Não declarar corrigido apenas porque attendance_mode foi atualizado.

É obrigatório comprovar que uma mensagem humana enviada enquanto a IA processa impede o envio da resposta da IA.
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
