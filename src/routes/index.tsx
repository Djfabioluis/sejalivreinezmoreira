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
        Execute esta instrucao no projeto: IMPLEMENTAR AI CONTROL CENTER — SEJA LIVRE AI PLATFORM

OBJETIVO

Criar uma central única para acompanhar, auditar e controlar todas as ações da IA dentro da plataforma.

O AI Control Center deve mostrar:

- atendimentos em andamento;
- decisões da IA;
- ferramentas executadas;
- memórias criadas;
- insights sugeridos;
- erros;
- consumo;
- saúde das integrações;
- ações pendentes de aprovação.

Não alterar regras atuais de atendimento.

Não criar autonomia irrestrita.

Não publicar automaticamente.

==================================================
1. CRIAR ROTA E MENU
==================================================

Criar rota autenticada:

/ai-control-center

Adicionar item no menu principal:

Central IA

ou:

AI Control Center

A página deve ser acessível apenas a usuários autorizados.

==================================================
2. VISÃO GERAL
==================================================

Criar dashboard com cards:

- Conversas atendidas hoje
- Conversas ativas
- Respostas enviadas
- Tempo médio de resposta
- Falhas da IA
- Tools executadas
- Memórias criadas
- Insights pendentes
- Follow-ups gerados
- Campanhas sugeridas
- Transferências para humano
- Taxa de resolução automática

Todos os dados devem vir de fontes reais.

Não usar mocks em produção.

==================================================
3. ABAS PRINCIPAIS
==================================================

Criar abas:

1. Atendimento
2. Decisões
3. Ferramentas
4. Memória
5. Aprendizado
6. Saúde
7. Logs
8. Configurações

==================================================
4. ABA ATENDIMENTO
==================================================

Mostrar tabela com:

- cliente;
- conversa;
- unidade;
- agente;
- estágio;
- última mensagem;
- última resposta da IA;
- tempo de resposta;
- status;
- humano assumiu;
- follow-up ativo;
- agendamento em andamento.

Filtros:

- unidade;
- agente;
- status;
- período;
- com erro;
- com intervenção humana;
- com follow-up.

Ao clicar em uma linha, abrir painel lateral com:

- histórico resumido;
- contexto atual;
- memória carregada;
- tools utilizadas;
- unidade efetiva;
- estágio do funil;
- última decisão da IA.

==================================================
5. ABA DECISÕES
==================================================

Criar registro de decisões da IA.

Cada decisão deve exibir:

- data e hora;
- conversa;
- cliente;
- unidade;
- tipo de decisão;
- ação escolhida;
- confiança;
- evidências usadas;
- resultado;
- se houve intervenção humana.

Tipos de decisão:

- identificar intenção;
- escolher próxima pergunta;
- consultar BEMP;
- transferir unidade;
- solicitar CPF;
- validar plano;
- listar profissionais;
- listar horários;
- criar agendamento;
- gerar follow-up;
- encaminhar para humano;
- cancelar automação.

Não armazenar raciocínio privado do modelo.

Salvar apenas resumo operacional estruturado:

{
  decisionType,
  selectedAction,
  confidence,
  evidenceCodes,
  result
}

==================================================
6. ABA FERRAMENTAS
==================================================

Mostrar todas as tool calls executadas.

Campos:

- tool;
- conversa;
- unidade;
- duração;
- status;
- código de erro;
- tentativa;
- data;
- resultado resumido.

Tools principais:

- list_services
- list_professionals
- list_slots
- create_appointment
- reschedule_appointment
- cancel_appointment
- get_customer_active_plans
- resolve_subscription_service
- transfer_conversation_unit
- send_followup
- get_customer_appointments

Filtros:

- sucesso;
- erro;
- lenta;
- integração;
- unidade;
- período.

Não exibir payload completo sensível.

Mascarar:

- CPF;
- telefone;
- tokens;
- URLs assinadas;
- dados pessoais desnecessários.

==================================================
7. ABA MEMÓRIA
==================================================

Mostrar memórias de clientes.

Campos:

- cliente;
- tipo;
- valor resumido;
- origem;
- confiança;
- criada em;
- atualizada em;
- status.

Status:

CONFIRMED
SUGGESTED
REJECTED
DELETED

Ações administrativas:

- confirmar;
- corrigir;
- rejeitar;
- excluir;
- visualizar histórico de versões.

Tipos:

- nome preferido;
- serviço preferido;
- profissional preferida;
- unidade preferida;
- dia preferido;
- horário preferido;
- plano;
- restrição;
- observação;
- pendência.

Não mostrar CPF completo.

==================================================
8. ABA APRENDIZADO
==================================================

Criar painel de sugestões de conhecimento.

Mostrar:

- título;
- categoria;
- evidência;
- quantidade de ocorrências;
- confiança;
- impacto estimado;
- status;
- data.

Status:

PENDING
APPROVED
REJECTED
PUBLISHED

Ações:

- aprovar;
- editar;
- rejeitar;
- publicar;
- visualizar evidências.

A IA nunca deve publicar automaticamente na base global.

Somente usuários autorizados podem aprovar e publicar.

==================================================
9. ABA SAÚDE
==================================================

Criar painel de saúde das integrações:

- IA
- Evolution
- BEMP
- Supabase
- Realtime
- Jobs
- Filas
- Storage
- Follow-up
- Campanhas

Para cada item mostrar:

- status;
- última verificação;
- latência;
- erros recentes;
- taxa de sucesso;
- último evento;
- tendência.

Status:

OK
DEGRADED
DOWN

Adicionar histórico das últimas 24 horas e 7 dias.

==================================================
10. ABA LOGS
==================================================

Criar visualizador de logs estruturados.

Filtros:

- traceId;
- conversationKey;
- customerId;
- unitId;
- agentId;
- jobId;
- event;
- nível;
- período;
- integração.

Níveis:

DEBUG
INFO
WARNING
ERROR
CRITICAL

Não carregar todos os logs de uma vez.

Usar paginação e filtros server-side.

==================================================
11. ABA CONFIGURAÇÕES
==================================================

Criar configurações de governança da IA:

- IA ativa/inativa;
- modelo principal;
- timeout;
- limite de histórico;
- limite de tokens;
- modo de follow-up;
- limite de tentativas;
- horário permitido;
- memória automática;
- aprovação de aprendizado;
- fallback humano;
- nível de logs.

Não expor API keys.

Alterações sensíveis devem:

- exigir permissão;
- registrar auditoria;
- mostrar confirmação;
- validar no backend.

==================================================
12. BANCO E REUTILIZAÇÃO
==================================================

Antes de criar novas tabelas, verificar estruturas existentes.

Reutilizar quando possível:

- ai_response_feedback;
- customer_ai_memory;
- knowledge_suggestions;
- evo_events;
- crm_followups;
- crm_recommendations;
- logs existentes;
- wa_conversas;
- wa_agentes.

Criar apenas o que estiver faltando.

Estruturas possíveis:

ai_decision_logs
ai_tool_execution_logs
ai_health_checks
ai_configuration_audit

Não duplicar tabelas equivalentes.

==================================================
13. LOGGER E TRACE
==================================================

Todas as ações devem usar o logger central.

Propagar:

- traceId;
- conversationKey;
- customerId;
- unitId;
- agentId;
- jobId;
- toolName;
- eventName.

Uma conversa deve poder ser rastreada do webhook até a resposta final.

==================================================
14. MÉTRICAS
==================================================

Criar consultas agregadas para o painel.

Não carregar dados brutos e calcular tudo no frontend.

Métricas:

- respostas por hora;
- tempo médio;
- taxa de erro;
- tools por conversa;
- falhas por integração;
- conversões;
- handoffs;
- follow-ups;
- memórias;
- insights;
- consumo por modelo;
- custo estimado, quando houver dados confiáveis.

Diferenciar custo estimado de custo real.

==================================================
15. ALERTAS
==================================================

Criar alertas internos para:

- IA sem responder;
- Evolution desconectada;
- BEMP indisponível;
- taxa de erro alta;
- tempo médio acima do limite;
- jobs presos;
- fila acumulada;
- follow-up falhando;
- campanha falhando;
- excesso de handoffs;
- tool com falha recorrente.

Não criar notificações externas nesta primeira etapa.

Mostrar os alertas no painel.

==================================================
16. PERMISSÕES
==================================================

Criar ou reutilizar permissões:

ai_control_view
ai_logs_view
ai_memory_manage
ai_learning_approve
ai_settings_manage
ai_health_view

Validar no backend.

Ocultar botões no frontend não é suficiente.

==================================================
17. PERFORMANCE
==================================================

A página deve usar:

- lazy loading;
- paginação;
- filtros server-side;
- queries agregadas;
- tabs carregadas sob demanda;
- virtualização para logs extensos;
- cache apropriado;
- sem subscriptions duplicadas.

Não carregar todas as abas ao abrir.

==================================================
18. UX
==================================================

Criar interface moderna e profissional.

Usar:

- cards;
- tabelas;
- filtros;
- drawers;
- badges;
- gráficos;
- estados vazios;
- skeleton;
- toasts;
- tema claro e escuro;
- responsividade.

Cores de saúde:

OK → verde
DEGRADED → amarelo
DOWN → vermelho

Não exagerar em animações.

==================================================
19. TESTES
==================================================

Criar testes para:

- acesso autorizado;
- acesso negado;
- métricas carregadas;
- filtro por unidade;
- decisão exibida;
- tool com erro;
- memória confirmada;
- memória rejeitada;
- insight aprovado;
- insight publicado;
- health check degradado;
- log pesquisado por traceId;
- alteração de configuração;
- auditoria da configuração;
- paginação;
- dados sensíveis mascarados.

==================================================
20. ENTREGA
==================================================

Ao concluir informar:

1. rota criada;
2. menu criado;
3. páginas e componentes;
4. tabelas reutilizadas;
5. migrations criadas;
6. métricas implementadas;
7. permissões;
8. logs;
9. health checks;
10. alertas;
11. arquivos alterados;
12. build;
13. typecheck;
14. lint;
15. testes.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

O AI Control Center só estará concluído quando for possível:

- acompanhar conversas;
- visualizar decisões;
- inspecionar tools;
- revisar memórias;
- aprovar aprendizados;
- acompanhar saúde;
- pesquisar logs;
- alterar configurações autorizadas.
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
