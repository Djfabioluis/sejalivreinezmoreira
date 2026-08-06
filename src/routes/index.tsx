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
        Execute esta instrucao no projeto: IMPLEMENTAR AI CONTROL CENTER — VERSÃO 2

PROJETO

Seja Livre AI Platform

CONTEXTO

A versão 1 do AI Control Center já foi implementada e validada com as abas:

- Atendimento
- Ferramentas
- Saúde
- Logs

Agora implementar somente:

- Memória
- Aprendizado
- Decisões
- Configurações

Não refatorar novamente a versão 1.

Não alterar regras de atendimento.

Não publicar automaticamente.

==================================================
1. ABA MEMÓRIA
==================================================

Reutilizar a estrutura existente de memória do cliente.

Antes de criar tabela nova, verificar:

customer_ai_memory
customer_memory_versions
ai_response_feedback
ou estruturas equivalentes.

Exibir:

- cliente;
- unidade;
- tipo de memória;
- valor resumido;
- origem;
- confiança;
- status;
- data de criação;
- última atualização;
- versão.

Tipos possíveis:

PREFERRED_NAME
PREFERRED_SERVICE
PREFERRED_PROFESSIONAL
PREFERRED_UNIT
PREFERRED_DAY
PREFERRED_TIME
SUBSCRIPTION
RESTRICTION
IMPORTANT_NOTE
PENDING_TOPIC

Status:

SUGGESTED
CONFIRMED
REJECTED
DELETED

==================================================
2. AÇÕES DE MEMÓRIA
==================================================

Permitir:

- confirmar;
- editar;
- rejeitar;
- excluir;
- visualizar histórico;
- restaurar versão anterior.

Toda ação deve:

- validar permissão no backend;
- registrar usuário responsável;
- registrar data;
- preservar versão anterior;
- usar auditoria.

Não apagar histórico ao editar.

==================================================
3. CONFIANÇA E ORIGEM
==================================================

Exibir origem:

EXPLICIT_CUSTOMER_STATEMENT
BEMP_CONFIRMED
APPOINTMENT_CONFIRMED
OPERATOR_CONFIRMED
INFERRED

Regras:

- INFERRED não pode substituir fato confirmado;
- BEMP_CONFIRMED prevalece para dados operacionais atuais;
- correção explícita da cliente deve gerar nova versão;
- não mostrar inferência como certeza.

==================================================
4. PRIVACIDADE DA MEMÓRIA
==================================================

Não exibir:

- CPF completo;
- telefone completo;
- dados bancários;
- tokens;
- documentos completos;
- informações sensíveis desnecessárias.

Aplicar mascaramento no backend antes da resposta.

Não depender somente da interface.

==================================================
5. ABA APRENDIZADO
==================================================

Reutilizar:

knowledge_suggestions

ou estrutura equivalente.

Exibir:

- título;
- categoria;
- conteúdo sugerido;
- resumo das evidências;
- quantidade de ocorrências;
- confiança;
- impacto estimado;
- status;
- criado em;
- revisado por;
- revisado em.

Status:

PENDING
APPROVED
REJECTED
PUBLISHED

==================================================
6. APROVAÇÃO DO APRENDIZADO
==================================================

Permitir:

- visualizar evidências;
- editar sugestão;
- aprovar;
- rejeitar;
- publicar;
- cancelar publicação.

A IA nunca pode publicar automaticamente.

Somente usuário com permissão:

ai_learning_approve

pode aprovar.

Somente usuário com permissão:

ai_learning_publish

pode publicar.

A aprovação e a publicação devem ser ações separadas.

==================================================
7. PROTEGER BASE GLOBAL
==================================================

Antes de publicar conhecimento:

- validar schema;
- verificar conflito com regras obrigatórias;
- verificar conteúdo malicioso;
- impedir instruções do cliente virarem regra;
- impedir preço ou política não confirmada;
- registrar versão;
- permitir rollback.

A base de conhecimento editável não pode sobrescrever regras técnicas obrigatórias.

==================================================
8. ABA DECISÕES
==================================================

Criar ou reutilizar:

ai_decision_logs

Cada decisão deve armazenar somente resumo operacional estruturado.

Não armazenar chain-of-thought, raciocínio privado ou prompt interno integral.

Estrutura:

{
  decisionType,
  selectedAction,
  confidence,
  evidenceCodes,
  resultCode,
  conversationId,
  customerId,
  unitId,
  agentId,
  traceId,
  createdAt
}

==================================================
9. TIPOS DE DECISÃO
==================================================

Exibir decisões como:

IDENTIFY_INTENT
SELECT_NEXT_STEP
REQUEST_CUSTOMER_NAME
REQUEST_CPF
VALIDATE_PLAN
SELECT_EFFECTIVE_UNIT
TRANSFER_UNIT
RESOLVE_SERVICE
LIST_PROFESSIONALS
LIST_SLOTS
CREATE_APPOINTMENT
GENERATE_FOLLOWUP
HANDOFF_HUMAN
CANCEL_AUTOMATION
CLOSE_CONVERSATION

==================================================
10. DETALHES DA DECISÃO
==================================================

Ao abrir uma decisão, mostrar:

- ação escolhida;
- confiança;
- códigos de evidência;
- unidade efetiva;
- estágio do funil;
- tools relacionadas;
- resultado;
- intervenção humana;
- traceId;
- duração.

Não mostrar conteúdo sensível integral.

==================================================
11. FILTROS DE DECISÕES
==================================================

Adicionar filtros:

- período;
- unidade;
- agente;
- cliente;
- tipo;
- confiança;
- resultado;
- com erro;
- com intervenção humana.

Usar paginação server-side.

==================================================
12. ABA CONFIGURAÇÕES
==================================================

Criar configurações de governança.

Se já existir tabela de configurações, reutilizar.

Configurações:

IA_ENABLED
PRIMARY_MODEL
AI_TIMEOUT_MS
AI_MAX_RETRIES
MAX_HISTORY_MESSAGES
MAX_CONTEXT_TOKENS
FOLLOWUP_AUTONOMY_MODE
FOLLOWUP_MAX_ATTEMPTS
FOLLOWUP_ALLOWED_START_TIME
FOLLOWUP_ALLOWED_END_TIME
CUSTOMER_MEMORY_ENABLED
AUTO_MEMORY_CONFIRMATION
LEARNING_APPROVAL_REQUIRED
HUMAN_FALLBACK_ENABLED
LOG_LEVEL

==================================================
13. ESCOPO DAS CONFIGURAÇÕES
==================================================

Permitir configuração por:

- organização;
- unidade;
- agente.

Prioridade:

agente
→ unidade
→ organização
→ padrão global.

Criar função central:

resolveAIConfiguration()

Não espalhar resolução de configuração pelo frontend.

==================================================
14. CONFIGURAÇÕES SENSÍVEIS
==================================================

Não exibir nem editar diretamente:

- API keys;
- service role;
- BEMP token;
- Evolution API key;
- segredos de webhook.

A tela pode mostrar apenas:

“Configurado”
ou
“Não configurado”.

Segredos permanecem em variáveis de ambiente ou cofre seguro.

==================================================
15. ALTERAÇÕES DE CONFIGURAÇÃO
==================================================

Toda alteração deve:

1. validar permissão;
2. validar schema Zod;
3. mostrar confirmação;
4. salvar versão anterior;
5. registrar auditoria;
6. atualizar cache;
7. permitir rollback.

Criar ou reutilizar:

ai_configuration_audit

Campos:

id
scope_type
scope_id
config_key
old_value
new_value
changed_by
changed_at
reason
trace_id

Mascarar valores sensíveis.

==================================================
16. FEATURE FLAGS
==================================================

Adicionar ou reutilizar feature flags para:

- memória automática;
- aprendizado;
- decisões;
- follow-up autônomo;
- campanhas automáticas;
- mídia;
- health checks.

Não ativar funcionalidades globalmente apenas por criar a tela.

==================================================
17. PERMISSÕES
==================================================

Validar no backend:

ai_memory_view
ai_memory_manage
ai_learning_view
ai_learning_approve
ai_learning_publish
ai_decisions_view
ai_settings_view
ai_settings_manage

Usuário sem permissão deve receber 403 real.

==================================================
18. PERFORMANCE
==================================================

As novas abas devem:

- carregar sob demanda;
- usar paginação;
- usar filtros server-side;
- evitar carregar históricos completos;
- usar consultas agregadas;
- não criar novas subscriptions desnecessárias.

Não carregar Memória, Aprendizado, Decisões e Configurações na abertura inicial da Central IA.

==================================================
19. UX
==================================================

Usar componentes do Design System existente.

Adicionar:

- filtros;
- tabelas;
- drawers;
- diff de versões;
- badges de confiança;
- badges de origem;
- dialogs de confirmação;
- skeleton;
- empty state;
- error state;
- toasts.

Não criar um segundo Design System.

==================================================
20. TESTES
==================================================

Criar testes para:

- visualizar memória;
- confirmar memória;
- rejeitar memória;
- editar memória;
- restaurar versão;
- mascarar CPF;
- aprovar aprendizado;
- impedir publicação sem permissão;
- publicar conhecimento;
- rollback de conhecimento;
- listar decisões;
- filtrar decisões;
- não expor raciocínio privado;
- editar configuração;
- resolver configuração por prioridade;
- rollback de configuração;
- acesso negado;
- paginação.

==================================================
21. RELATÓRIO
==================================================

Criar:

docs/ai-control-center-v2.md

Incluir:

- arquitetura;
- fontes de dados;
- tabelas reutilizadas;
- migrations;
- permissões;
- mascaramento;
- versionamento;
- configurações;
- testes;
- riscos;
- pendências.

==================================================
22. ENTREGA
==================================================

Ao concluir informar:

1. abas implementadas;
2. componentes criados;
3. tabelas reutilizadas;
4. migrations criadas;
5. permissões;
6. versionamento;
7. auditoria;
8. feature flags;
9. arquivos alterados;
10. build;
11. typecheck;
12. lint;
13. testes.

Não publicar automaticamente.

CRITÉRIO DE CONCLUSÃO

A versão 2 só estará concluída quando for possível:

- revisar e corrigir memórias;
- aprovar ou rejeitar aprendizados;
- auditar decisões operacionais;
- alterar configurações autorizadas;
- restaurar versões anteriores;
- garantir que dados sensíveis e raciocínio privado não sejam expostos.
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
