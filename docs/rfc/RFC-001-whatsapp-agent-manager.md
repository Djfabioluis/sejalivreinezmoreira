# RFC 001: WhatsApp Agent Manager Especificação Funcional

## 1. Introdução
Este documento descreve a especificação funcional para o módulo Gerenciador de Agentes WhatsApp na Seja Livre AI Platform.

## 2. Requisitos Funcionais

### 2.1 Gestão de Agentes
- O sistema deve permitir criar, editar, listar e excluir agentes.
- Cada agente deve estar obrigatoriamente vinculado a uma Unidade e Empresa.
- O sistema deve exibir o status em tempo real (Conectado, Desconectado, Aguardando QR).

### 2.2 Integração Evolution API
- A criação de instâncias deve ser automatizada via `EvolutionService`.
- O QR Code deve ser exibido em um componente com atualização via Realtime/Polling.
- O Webhook deve ser configurado automaticamente no momento da conexão.

### 2.3 Configuração de IA
- Cada agente pode ter configurações específicas de IA: Prompt Base, Base de Conhecimento e Modelo.
- Opção para ativar/desativar a IA globalmente por agente.

## 3. Requisitos Não Funcionais
- **Performance**: A listagem de instâncias deve carregar em menos de 2s.
- **Segurança**: RLS deve garantir que usuários vejam apenas agentes de suas unidades/empresas.
- **Observabilidade**: Todas as ações críticas (conexão, exclusão) devem gerar logs de auditoria.

## 4. UI/UX
- Utilizar um Wizard de 6 passos para criação de novos agentes.
- Interface responsiva com suporte a Dark Mode.
- Toasts de notificação para feedback imediato de ações.
