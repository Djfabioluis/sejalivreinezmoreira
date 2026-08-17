# Plano de Implementação — Painel Administrativo Seja Livre

Este plano detalha a construção do Painel Administrativo para o portal Seja Livre, focado na gestão de colaboradores, contratos e manuais, com acesso restrito a administradores.

## 1. Banco de Dados (Supabase)
*   **Tabelas de Profissionais**: `professional_profiles` para armazenar dados cadastrais, biografia e fotos.
*   **Gestão de Contratos**: `contracts` (metadados), `contract_files` (armazenamento PDF) e `contract_events` (log de auditoria e assinaturas).
*   **Manuais e Treinamento**: `employee_manuals` e `employee_manual_acknowledgements` para rastrear quem leu os documentos obrigatórios.
*   **Comunicação**: `admin_notifications` para avisos gerais aos colaboradores.
*   **Segurança**: RLS restringindo leitura/escrita de tabelas administrativas apenas para usuários com `role = 'admin'`.

## 2. Estrutura de Rotas (TanStack Start)
*   `/admin`: Layout base com `AdminSidebar` e proteção de acesso (`isAdmin`).
*   `/admin/index`: Dashboard principal com indicadores (KPIs) e alertas.
*   `/admin/colaboradores`: Lista, busca e gestão de perfis profissionais.
*   `/admin/contratos`: Monitoramento de status de assinaturas e expirações.
*   `/admin/manual`: Upload e gestão de manuais do colaborador.
*   `/admin/configuracoes`: Ajustes globais do portal.

## 3. Componentes e UI (Shadcn/UI + Tailwind)
*   **AdminSidebar**: Navegação dedicada com contadores de notificações/pendências.
*   **DataTable Administrativo**: Componente reutilizável para listagens com filtros e ações (Dropdown).
*   **Modais de Ação**: Para cadastro de novos profissionais e upload de documentos.
*   **Identidade Visual**: Manutenção do tema "Blush & Lavender" com toques profissionais em verde escuro (#2D5A5B).

## Detalhes Técnicos
*   Utilização de `createServerFn` para operações privilegiadas no servidor.
*   Integração com `getMyPermissions` para validação de privilégios em tempo de carregamento da rota.
*   Políticas RLS robustas com `has_role` para garantir isolamento de dados.
