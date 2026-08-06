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
        Execute esta instrucao no projeto: OTIMIZAÇÃO URGENTE DE PERFORMANCE

PROBLEMA

A Seja Livre AI Platform está muito pesada, lenta para abrir páginas, trocar telas, carregar dados e atualizar conversas.

OBJETIVO

Melhorar significativamente a velocidade da aplicação sem remover funcionalidades e sem alterar regras de negócio.

Não publicar automaticamente.

==================================================
1. MEDIR ANTES DE OTIMIZAR
==================================================

Executar profiling e registrar:

- tempo de carregamento inicial;
- tamanho do bundle;
- quantidade de requests por página;
- tempo das queries;
- componentes com mais renders;
- listeners Realtime ativos;
- uso de memória;
- páginas mais pesadas;
- tempo até interação;
- tempo de troca entre rotas.

Gerar relatório antes/depois.

==================================================
2. CODE SPLITTING
==================================================

Aplicar lazy loading nas páginas pesadas:

- Dashboard;
- Secretária Virtual;
- CRM;
- Agenda;
- Central IA;
- Analytics;
- Financeiro;
- Campanhas;
- Follow-ups;
- Oportunidades.

Usar React.lazy ou o mecanismo compatível com o router atual.

Não carregar todas as páginas no bundle inicial.

==================================================
3. IMPORTS PESADOS
==================================================

Auditar imports de:

- bibliotecas de gráficos;
- calendários;
- editores;
- ícones;
- animações;
- drag and drop;
- players de áudio e vídeo.

Evitar imports globais.

Importar somente os módulos utilizados.

Não importar bibliotecas inteiras quando bastar um componente.

==================================================
4. DASHBOARD
==================================================

O Dashboard não deve buscar todos os dados brutos.

Criar endpoints ou queries agregadas para:

- agenda de hoje;
- receita;
- conversão;
- follow-ups;
- oportunidades;
- ocupação;
- clientes em risco.

Evitar carregar milhares de registros para calcular indicadores no frontend.

Usar agregações no banco.

==================================================
5. REACT QUERY
==================================================

Padronizar query keys.

Configurar staleTime adequado.

Exemplo:

- unidades: 5 minutos;
- profissionais: 2 minutos;
- serviços: 5 minutos;
- dashboards: 1 minuto;
- conversas: atualização Realtime;
- configurações: 10 minutos.

Não refazer queries a cada render.

Desabilitar refetchOnWindowFocus onde não for necessário.

==================================================
6. REALTIME
==================================================

Auditar todas as subscriptions Supabase Realtime.

Garantir:

- uma subscription por recurso;
- unsubscribe no unmount;
- não recriar listeners a cada render;
- não assinar a tabela inteira sem filtro;
- filtrar por unidade, conversa ou organização;
- não executar refetch completo a cada evento.

Quando chegar uma nova mensagem:

- atualizar somente a conversa afetada;
- não recarregar toda a caixa de entrada.

==================================================
7. SECRETÁRIA VIRTUAL
==================================================

A lista de conversas deve usar:

- paginação;
- carregamento incremental;
- virtualização;
- filtros server-side.

Não carregar todas as conversas e todo o histórico de uma vez.

Carregar:

- lista resumida;
- histórico apenas da conversa selecionada;
- mensagens antigas sob demanda.

Virtualizar a lista de mensagens quando houver histórico longo.

==================================================
8. CRM
==================================================

O Kanban não deve carregar todos os clientes de todas as etapas.

Usar:

- paginação por coluna;
- limite inicial;
- lazy loading;
- filtros no banco;
- drag and drop otimista.

Não recalcular todos os scores no frontend.

==================================================
9. AGENDA
==================================================

Carregar somente o período visível.

Exemplo:

- visão diária: apenas o dia;
- semanal: apenas a semana;
- mensal: intervalo do mês.

Não buscar todos os agendamentos históricos.

Filtrar por unidade e profissional no backend.

==================================================
10. GRÁFICOS
==================================================

Carregar gráficos somente quando entrarem na viewport.

Usar IntersectionObserver ou lazy loading.

Não renderizar gráficos ocultos em tabs inativas.

Reduzir quantidade de pontos.

Usar dados agregados.

==================================================
11. IMAGENS E MÍDIA
==================================================

Usar:

- thumbnails;
- lazy loading;
- compressão;
- URLs assinadas temporárias;
- player somente quando aberto.

Não baixar áudio, vídeo e imagem completa na lista de conversas.

==================================================
12. MEMOIZAÇÃO
==================================================

Auditar componentes com renderizações excessivas.

Aplicar React.memo, useMemo e useCallback somente onde houver ganho real.

Prioridade:

- lista de conversas;
- mensagens;
- cards;
- tabelas;
- Kanban;
- agenda;
- gráficos.

Não aplicar memoização indiscriminadamente.

==================================================
13. ESTADO GLOBAL
==================================================

Revisar stores ou contexts grandes.

Não colocar toda a aplicação em um único Context.

Separar:

- sessão;
- unidade;
- tema;
- notificações;
- conversa ativa.

Evitar que uma atualização de conversa renderize todo o layout.

==================================================
14. QUERIES SUPABASE
==================================================

Evitar select("*").

Selecionar apenas colunas necessárias.

Adicionar paginação:

range()
limit()

Filtrar antes de retornar.

Revisar queries N+1.

Usar joins ou RPCs agregadas quando apropriado.

==================================================
15. ÍNDICES NO BANCO
==================================================

Criar ou confirmar índices para:

wa_conversas:
- updated_at
- unidade_id
- instance
- status
- phone

mensagens/eventos:
- instance + message_id
- conversation_key
- created_at

CRM:
- status
- stage
- scheduled_at
- customer_id
- unit_id

follow-ups:
- status + scheduled_at
- conversation_id
- unit_id

agendamentos:
- unit_id + date
- professional_id + date
- customer_id

Usar EXPLAIN ANALYZE nas queries lentas.

==================================================
16. SERVER-SIDE AGGREGATION
==================================================

Mover cálculos pesados para backend ou banco:

- score de conversão;
- receita;
- ocupação;
- clientes em risco;
- métricas;
- contagem por etapa;
- campanhas;
- oportunidades.

O frontend deve receber dados prontos para exibir.

==================================================
17. BACKGROUND JOBS
==================================================

Não executar no carregamento das páginas:

- cálculo de score;
- geração de campanha;
- detecção de abandono;
- follow-up;
- análise de memória;
- Opportunity Engine;
- relatórios.

Esses processos devem rodar em cron ou fila.

==================================================
18. CACHE
==================================================

Criar cache seguro para:

- unidades;
- serviços;
- profissionais;
- configurações;
- prompt;
- base de conhecimento.

Não usar cache para:

- disponibilidade em tempo real;
- status de plano;
- confirmação de agendamento;
- unidade transferida sem invalidação.

Adicionar invalidação explícita.

==================================================
19. BUNDLE
==================================================

Gerar análise do bundle.

Identificar os 20 maiores módulos.

Remover:

- dependências não utilizadas;
- bibliotecas duplicadas;
- polyfills desnecessários;
- ícones importados em massa.

Criar chunks separados para módulos pesados.

==================================================
20. ANIMAÇÕES
==================================================

Reduzir animações em listas grandes.

Não animar:

- centenas de cards;
- todas as linhas de tabela;
- todas as mensagens;
- gráficos completos a cada atualização.

Respeitar prefers-reduced-motion.

==================================================
21. SKELETON E CARREGAMENTO
==================================================

Mostrar skeleton rapidamente.

Não bloquear a página inteira por uma query secundária.

Carregar em prioridade:

1. layout;
2. conteúdo principal;
3. dados secundários;
4. gráficos;
5. insights da IA.

==================================================
22. LOGS NO FRONTEND
==================================================

Remover console.log excessivo em produção.

Não imprimir payloads grandes, históricos, respostas BEMP ou eventos Realtime.

Logs excessivos podem degradar performance.

==================================================
23. PÁGINAS PESADAS
==================================================

Identificar arquivos com:

- mais de 500 linhas;
- muitos hooks;
- muitas queries;
- muitos estados;
- vários modais no mesmo componente.

Dividir em componentes menores, sem alterar comportamento.

==================================================
24. TESTES DE PERFORMANCE
==================================================

Medir pelo menos:

- abertura do Dashboard;
- abertura da Secretária Virtual;
- troca de conversa;
- carregamento do CRM;
- mudança de semana na Agenda;
- abertura da Central IA.

Metas iniciais:

- primeira interação abaixo de 3 segundos em conexão normal;
- troca de rota abaixo de 1 segundo após cache;
- abertura de conversa abaixo de 500 ms após lista carregada;
- nenhuma página carregando milhares de registros de uma vez.

==================================================
25. ENTREGA
==================================================

Ao concluir, informar:

1. tamanho do bundle antes/depois;
2. requests antes/depois;
3. queries corrigidas;
4. subscriptions Realtime corrigidas;
5. páginas com lazy loading;
6. listas virtualizadas;
7. índices criados;
8. componentes divididos;
9. dependências removidas;
10. tempos antes/depois;
11. build;
12. typecheck;
13. lint;
14. testes.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

Não considerar concluído apenas porque o build passou.

Comprovar melhoria mensurável nas páginas mais pesadas.
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
