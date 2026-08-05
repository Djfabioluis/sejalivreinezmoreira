# Julia — Secretária Virtual com IA para Salões e Clínicas

SaaS de atendimento automatizado no WhatsApp para salões de beleza, clínicas estéticas e negócios similares. A Julia atende clientes, agenda serviços, gerencia planos de assinatura, faz cross-sell e mantém a agenda sincronizada com o BEMP — tudo via WhatsApp, 24 horas por dia.

> **Status:** em desenvolvimento ativo.  
> **Stack:** TanStack Start · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Lovable Cloud) · Stripe · Evolution API · Google Gemini.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Arquitetura](#arquitetura)
3. [Tecnologias](#tecnologias)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Primeiros Passos](#primeiros-passos)
6. [Variáveis de Ambiente](#variáveis-de-ambiente)
7. [Scripts Disponíveis](#scripts-disponíveis)
8. [Integrações](#integrações)
9. [Segurança](#segurança)
10. [Roadmap](#roadmap)

---

## Funcionalidades

### Atendimento via WhatsApp
- Conexão com WhatsApp através da **Evolution API** (QR Code).
- IA humanizada chamada **Julia**, recepcionista do Salão Seja Livre.
- Respostas em texto e áudio (TTS OpenAI).
- Suporte a mensagens de **áudio, imagem, vídeo e documento** com transcrição/descrição via Gemini.
- Indicador nativo de “digitando...” para respostas mais humanizadas.
- Transferência de atendimento entre unidades quando o cliente solicita.

### Agendamentos
- Agendamento automático de atendimentos com profissionais e serviços reais do BEMP.
- Regras inteligentes de seleção de profissional:
  - 0 profissionais → informa indisponibilidade.
  - 1 profissional → seleciona automaticamente, sem perguntar preferência.
  - 2+ profissionais → pergunta preferência, com opção “Sem preferência”.
- Reagendamento e cancelamento com confirmação.
- Verificação de saldo de visitas em planos de assinatura ativos.

### Planos e Assinaturas
- Integração com **Stripe** para cobrança recorrente.
- Planos mensal, trimestral, semestral e anual.
- Validação de planos via CPF com integração ao BEMP.
- Tela de vendas de assinaturas (SaaS) para revenda do sistema.

### Dashboard Administrativo
- Central de atendimento do WhatsApp em tempo real.
- Clientes atendidos e fila de atendimento humano.
- Gestão de operadores e permissões customizáveis (RBAC).
- Configuração de agentes de WhatsApp e unidades.
- Logs do webhook da Evolution API.
- Histórico de reagendamentos por cliente.
- Base de conhecimento e aprendizado contínuo da IA.

### Notificações Automáticas
- Confirmação de agendamento.
- Lembretes automáticos via `pg_cron`.
- Notificações de cancelamento e reagendamento.

### Sandbox
- Modo sandbox para simular conversas e agendamentos sem gravar no BEMP.
- Simulador de IA para testes internos.

---

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│                        Cliente (Navegador)                    │
│              React 19 · TanStack Router · Tailwind            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     TanStack Start (Edge)                   │
│  Server Functions · API Routes · SSR · Serverless Worker  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌──────────┐    ┌──────────┐
        │Supabase │    │  Stripe  │    │ Evolution│
        │  (DB)   │    │Pagamentos│    │   API    │
        └─────────┘    └──────────┘    └──────────┘
                              │
                              ▼
                        ┌──────────┐
                        │   BEMP   │
                        │   ERP    │
                        └──────────┘
```

O fluxo de uma mensagem recebida:

1. **Evolution API** envia webhook para `/api/public/whatsapp-evolution`.
2. O payload é normalizado e validado.
3. Aplica-se idempotência por `instance + messageId`.
4. O lock por conversa evita processamento concorrente.
5. Mensagens de mídia passam por pipeline de análise (transcrição/descrição).
6. A IA Julia processa o texto e decide a ação.
7. Ferramentas MCP consultam o BEMP (serviços, profissionais, horários, clientes).
8. A resposta é enviada de volta ao WhatsApp via Evolution API.
9. Logs e histórico são persistidos no Supabase.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | TanStack Start v1 |
| Frontend | React 19, TanStack Router, TanStack Query |
| Estilos | Tailwind CSS v4, Radix UI, shadcn/ui |
| Backend | `createServerFn`, Server Routes (Edge) |
| Banco de dados | Supabase (PostgreSQL) |
| Auth | Supabase Auth com Google OAuth |
| Pagamentos | Stripe Embedded Checkout |
| WhatsApp | Evolution API v2.3.7 |
| IA | Google Gemini via Lovable AI Gateway |
| Áudio | OpenAI TTS, Gemini STT |
| Cache | TTL em memória para permissões e credenciais |

---

## Estrutura de Pastas

```text
src/
├── components/           # Componentes reutilizáveis (UI, WhatsApp QR, etc.)
├── hooks/                # Hooks customizados
├── integrations/         # Clientes gerados (Supabase, Lovable, etc.)
├── lib/                  # Lógica de negócio
│   ├── bemp/             # Integração com BEMP (atribuições, assinaturas)
│   ├── evolution/        # Pipeline de webhook da Evolution API
│   ├── mcp/              # Ferramentas MCP para a IA
│   ├── memory/             # Aprendizado contínuo da IA
│   └── *.functions.ts    # Server functions expostas ao cliente
├── routes/               # Rotas do TanStack Start
│   ├── _authenticated/   # Área logada (dashboard)
│   ├── api/              # Endpoints públicos e internos
│   ├── auth.tsx          # Tela de login
│   └── index.tsx         # Landing page / vendas
├── styles.css            # Variáveis do Tailwind v4
├── router.tsx            # Configuração do roteador
├── server.ts             # Configuração do servidor
└── start.ts              # Middleware e inicialização
```

---

## Primeiros Passos

### Requisitos

- Node.js 20+
- bun (recomendado) ou npm
- Conta no Lovable Cloud (Supabase + Auth)
- Conta Stripe (modo teste para desenvolvimento)
- Instância Evolution API v2.3.7+
- Credenciais BEMP (domínio + token)

### Instalação

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd <nome-do-repositorio>

# Instale as dependências
bun install

# Configure as variáveis de ambiente (veja a seção abaixo)
cp .env.example .env

# Inicie o servidor de desenvolvimento
bun dev
```

O app estará disponível em `http://localhost:8080`.

---

## Variáveis de Ambiente

Crie um arquivo `.env` na raiz com as seguintes variáveis:

```env
# Supabase / Lovable Cloud
VITE_SUPABASE_URL=https://<seu-projeto>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<sua-chave-anon>
SUPABASE_SERVICE_ROLE_KEY=<sua-chave-service-role>

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Evolution API
EVOLUTION_API_URL=https://<sua-instancia-evolution>/api
EVOLUTION_API_KEY=<api-key>
EVOLUTION_WEBHOOK_SECRET=<segredo-do-webhook>

# BEMP
BEMP_DOMAIN=<dominio>.bemp.com.br
BEMP_TOKEN=<token>

# OpenAI (TTS)
OPENAI_API_KEY=sk-...

# Segredos internos
CRON_SECRET=<segredo-para-cron-e-webhooks>
```

> Nunca commite arquivos `.env` no repositório.

---

## Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `bun dev` | Inicia servidor de desenvolvimento com HMR |
| `bun run build` | Build de produção |
| `bun run build:dev` | Build no modo desenvolvimento |
| `bun run preview` | Preview do build de produção |
| `bun run lint` | Executa ESLint |
| `bun run format` | Formata código com Prettier |

---

## Integrações

### BEMP
A integração com o BEMP permite:
- Listar unidades, serviços e profissionais.
- Consultar horários disponíveis.
- Criar, cancelar e reagendar atendimentos.
- Verificar planos de assinatura e saldo de visitas.

As credenciais são configuradas na tela `/integracao-bemp`.

### Evolution API
A conexão com WhatsApp é feita via Evolution API v2.3.7. O fluxo:
1. Administrador cadastra um agente no painel.
2. Sistema gera QR Code para conexão.
3. Após a conexão, o administrador seleciona a unidade vinculada.
4. Webhook passa a receber mensagens e enviar respostas.

### Stripe
- Checkout embedado para assinaturas.
- Webhook em `/api/public/payments/webhook` para sincronização de status.
- Planos definidos em `src/lib/plans.ts`.

---

## Segurança

- Autenticação via Supabase Auth (Google OAuth).
- Controle de acesso baseado em papéis (RBAC) com `user_roles` e `has_role`.
- Row Level Security (RLS) ativado em todas as tabelas públicas.
- Webhooks da Evolution API validados por `x-webhook-secret`.
- Funções `SECURITY DEFINER` com permissões revogadas do `PUBLIC`.
- Dados sensíveis mascarados em logs e aprendizado da IA.
- Variáveis de ambiente nunca expostas no cliente.

---

## Roadmap

- [x] Atendimento WhatsApp com IA humanizada
- [x] Agendamento integrado ao BEMP
- [x] Reagendamento e cancelamento
- [x] Planos de assinatura via Stripe
- [x] Suporte a áudio, imagem, vídeo e documento
- [x] Dashboard administrativo com RBAC
- [x] Notificações automáticas (confirmação e lembretes)
- [x] Sandbox e simulador de IA
- [x] Transferência de atendimento entre unidades
- [x] Aprendizado contínuo da IA
- [ ] Aplicativo mobile nativo
- [ ] Multi-idioma (espanhol, inglês)
- [ ] Relatórios avançados de conversão

---

## Licença

Este projeto é proprietário. Todos os direitos reservados.

---

Desenvolvido com [Lovable](https://lovable.dev).
