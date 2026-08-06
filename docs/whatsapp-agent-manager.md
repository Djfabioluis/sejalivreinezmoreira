# WhatsApp Agent Manager

## Objetivo
Criar um módulo completo para gerenciamento das instâncias e agentes da Evolution API, substituindo qualquer configuração manual. Toda configuração deverá ser feita pela interface da Seja Livre AI Platform.

## Arquitetura
- **Frontend**: React com TanStack Router, Tailwind CSS e Shadcn/UI.
- **Backend**: TanStack Start (Server Functions) e Supabase (PostgreSQL + RLS).
- **Integração**: Evolution API via `EvolutionService`.

## Fluxo de Configuração (Wizard)
1. **Dados Básicos**: Nome, Empresa, Unidade, Idioma, Fuso Horário.
2. **Instância**: Criação automática ou seleção de instância existente.
3. **Conexão**: Geração e leitura de QR Code em tempo real.
4. **Associação**: Vinculação automática de Empresa -> Unidade -> Agente -> Instância.
5. **Configuração IA**: Definição de modelo, temperatura, prompt e base de conhecimento.
6. **Finalização**: Confirmação de sucesso e redirecionamento.

## Telas
- **Painel**: Visão geral de métricas.
- **Agentes**: Listagem e gestão de agentes (status, última conexão, etc).
- **Instâncias**: Detalhes técnicos das instâncias da Evolution API.
- **Logs**: Histórico de eventos e auditoria.

## Banco de Dados
Tabela: `whatsapp_agents`
- `id`: UUID
- `organization_id`: FK
- `unit_id`: FK
- `agent_name`: String
- `instance_name`: String
- `phone`: String
- `evolution_instance_id`: String
- `webhook_url`: String
- `status`: Enum
- `ai_enabled`: Boolean
- `knowledge_base_id`: UUID
- `prompt_version`: String
- `created_at`: Timestamp
- `updated_at`: Timestamp

## Validações
- Não permitir duas unidades na mesma instância.
- Não permitir dois agentes com o mesmo número.
- Webhook obrigatório e válido.
- Agente deve estar vinculado a empresa e unidade.
