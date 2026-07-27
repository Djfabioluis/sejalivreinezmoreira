# Plano: Configurar WhatsApp Cloud API no dashboard

## Objetivo
Criar uma área dentro do painel administrativo para inserir, visualizar e testar as credenciais do WhatsApp Cloud API (Meta), sem depender de edição manual de variáveis de ambiente.

## O que será construído

### 1. Server functions de configuração do WhatsApp
- Criar `src/lib/whatsapp-config.functions.ts` com três funções protegidas a administradores:
  - `getWhatsAppSettings`: retorna domínio/fonte (db/env/none) e se há token salvo.
  - `saveWhatsAppSettings`: valida e persiste Access Token, Phone Number ID, App Secret e Verify Token.
  - `testWhatsAppConnection`: chama a Meta Graph API para confirmar que o número está acessível.
- As credenciais serão salvas no banco (`base_conhecimento` id=4), mantendo o mesmo padrão já usado para a Bemp, com RLS restrito a administradores.
- O código do webhook e do envio de mensagens passará a ler primeiro o banco e usar `process.env` como fallback, para que a tela funcione sem reimplantação.

### 2. Página de configuração no dashboard
- Criar `src/routes/_authenticated/configuracao-whatsapp.tsx` com:
  - Campos para Access Token, Phone Number ID, App Secret e Verify Token.
  - Indicador de status (não configurado / usando env / salvo no banco).
  - Botão "Testar conexão" que exibe o número conectado ou erro da Meta.
  - Instruções com a URL exata do webhook a colar no Meta Developers.
  - Link `https://wa.me/{numero}` e QR Code para o usuário escanear.
- A tela será restrita a administradores.

### 3. Menu lateral
- Adicionar item "Configuração do WhatsApp" no `AppSidebar` dentro do grupo "Configuração", com permissão `config-whatsapp` (visível por padrão para administradores).

### 4. Ajustes nos pontos de leitura de credenciais
- Atualizar `src/routes/api/public/whatsapp.ts` para ler credenciais do banco quando disponíveis.
- Atualizar `src/lib/whatsapp-send.server.ts` para o mesmo comportamento.
- Atualizar `src/lib/whatsapp.functions.ts` para usar a nova fonte de configuração.

## Como você usará depois
1. Acesse **Configuração → WhatsApp** no menu lateral.
2. Cole as credenciais obtidas no Meta Developers.
3. Clique em **Testar conexão**.
4. Copie a URL do webhook exibida na tela e cole no campo "Webhook URL" do Meta Developers, junto com o Verify Token.
5. Salve e envie uma mensagem de teste pelo WhatsApp.

## Observações importantes
- As credenciais serão armazenadas de forma segura, acessíveis apenas a administradores via RLS.
- O webhook continuará em `/api/public/whatsapp`, já configurado para validar assinatura e processar mensagens.
- Nenhuma alteração será feita no fluxo de conversação da IA Julia nem nos agendamentos.

## Arquivos que serão alterados/criados
- `src/lib/whatsapp-config.functions.ts` (novo)
- `src/routes/_authenticated/configuracao-whatsapp.tsx` (novo)
- `src/components/app-sidebar.tsx` (editar)
- `src/lib/whatsapp.functions.ts` (editar)
- `src/lib/whatsapp-send.server.ts` (editar)
- `src/routes/api/public/whatsapp.ts` (editar)
- `src/lib/bemp.server.ts` (pequeno ajuste para expor helper de leitura genérico, se necessário)