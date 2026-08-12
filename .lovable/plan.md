# Plano de Transformação: Central de Atendimento WhatsApp

Transformar a aba "Secretária virtual" em uma central de atendimento completa, integrando a Caixa de Entrada real com a Evolution API e preservando o Simulador da IA.

## Mudanças no Banco de Dados (Migrations)

- Criar ou atualizar a função SQL `append_wa_message` para ser atômica e lidar com `unread_count`, `instance`, `phone_number`, `contact_name` e `status`.
- Garantir que a tabela `wa_conversas` tenha índices para performance em buscas e ordenação.

## Mudanças no Backend (Server Functions & Webhooks)

- **Webhook (`src/routes/api/public/whatsapp-evolution.ts`)**:
  - Ajustar o fluxo de persistência para usar a nova função atômica.
  - Atualizar metadados do contato (nome, número, instância) a cada mensagem.
- **Functions (`src/lib/whatsapp-inbox.functions.ts`)**:
  - Implementar/Refinar `listWAConversations` com filtros de busca, status e instância.
  - Implementar/Refinar `sendManualWAMessage` validando permissões e chamando a Evolution API.
  - Adicionar `markAsRead` para zerar o contador de não lidas.

## Mudanças no Frontend (UI/UX)

- **Página Principal (`src/routes/_authenticated/agendar.tsx`)**:
  - Implementar abas: "Caixa de Entrada" (padrão) e "Simulador da IA".
  - **Layout de Duas Colunas**:
    - **Lista (Esquerda)**: Cards com nome/telefone, última mensagem, contador de não lidas, status e instância.
    - **Chat (Direita)**: Histórico completo, cabeçalho com troca de status e área de envio manual.
  - **Realtime**: Conectar com Supabase Realtime para atualizações instantâneas sem refresh.
  - **Responsividade**: No mobile, lista e chat alternam em visualização única.

## Componentes Novos/Refatorados

- **`AiSimulator`**: Mover a lógica atual de simulação local para este componente isolado.
- **`WAConversationList`**: Componente de lista com busca e filtros.
- **`WAChatWindow`**: Visualização da conversa selecionada.

## Detalhes Técnicos

- **Atomicidade**: Uso de RPC no Supabase para evitar condições de corrida no array de mensagens JSONB.
- **Extração de Texto**: Função `extractConversationMessageText` robusta para lidar com diferentes formatos de payload.
- **Segurança**: Validação de permissões e autenticação em todas as Server Functions.

---

Este plano foca na estabilidade do processamento em serverless e na experiência de tempo real para o atendente.
