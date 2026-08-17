# Plano de Implementação: Painel Administrativo Completo - Seja Livre

Este plano detalha a implementação do Painel Administrativo completo para o Portal do Colaborador, seguindo as diretrizes de design, segurança e funcionalidade solicitadas.

## 1. Ajustes de Identidade Visual e Layout
*   Atualizar o tema CSS para incluir a paleta solicitada (Verde-água, Turquesa suave) mantendo a sofisticação.
*   Refinar o `AdminSidebar` para incluir todos os itens solicitados e os badges dinâmicos.
*   Implementar o cabeçalho superior com o nome do administrador logado.

## 2. Expansão do Dashboard Principal
*   Adicionar novos cards de indicadores: "Contratos Pendentes há mais de 7 dias", "Manuais Pendentes de Leitura".
*   Implementar a seção de "Ações Rápidas" e "Pendências Urgentes" com links diretos para as listas filtradas.
*   Adicionar gráficos executivos simples (Contratos por status, Colaboradores por modalidade).

## 3. Gestão de Colaboradores e Perfis Detalhados
*   **Página de Listagem**: Melhorar filtros (Ativos, Inativos, Sem contrato) e busca.
*   **Página de Detalhes (`/admin/colaboradores/$id`)**: Implementar visualização completa com abas (Dados, Contrato, Documentos, Manual, Histórico).
*   **Ações**: Implementar ativação/desativação e edição de dados.

## 4. Gestão de Contratos e Assinaturas
*   **Página "Aguardando Assinatura"**: Foco em contratos pendentes, com destaque visual para os que ultrapassaram 7 dias.
*   **Página de Detalhes do Contrato (`/admin/contratos/$id`)**: Visualização do PDF, histórico/timeline do contrato e ações de cancelamento/download.
*   **Filtros Avançados**: Por número de contrato, modalidade e status detalhado.

## 5. Documentos e Manual do Colaborador
*   **Gestão de Documentos**: Listagem e download seguro (storage privado).
*   **Manual do Colaborador**: Interface para criação/edição de versões, publicação e controle de leitura (quem já leu vs pendente).

## 6. Central de Notificações e Configurações
*   **Notificações**: Central administrativa para alertas de novos cadastros, assinaturas e atrasos.
*   **Configurações do Sistema**: Cadastro de modalidades, percentuais padrão e dados da empresa.
*   **Gestão de Administradores**: Controle de acesso para outros usuários admin.

## 7. Segurança e Auditoria
*   **Auditoria**: Página de logs para registrar ações administrativas críticas.
*   **Mascaramento**: Garantir que CPFs sejam mostrados parcialmente em listas gerais.
*   **RLS e Guards**: Validar se todas as rotas e funções server-side estão protegidas pelo papel de ADMIN.

## Detalhes Técnicos
*   **Tecnologias**: TanStack Start, Supabase (RLS + Auth), Tailwind CSS.
*   **Segurança**: Uso de `supabaseAdmin` apenas em funções server-side protegidas; máscaras de dados no frontend.
*   **Responsividade**: Layout adaptável para mobile usando o sistema de Sidebar do shadcn.

---
O Painel será integrado ao sistema atual sem remover funcionalidades existentes, garantindo uma transição fluida para os administradores.
