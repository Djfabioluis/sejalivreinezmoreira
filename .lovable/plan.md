# Corrigir "OAuth timed out waiting for response" no login com Google

## O que está acontecendo

Os logs de autenticação mostram um login Google concluído com sucesso às 17:56 (provedor `google`, token emitido). Ou seja, o Google autenticou, mas a tela de login continuou esperando a resposta e estourou o tempo limite.

A causa está em `src/routes/auth.tsx`: o botão do Google envia como URL de retorno `window.location.origin + destino`, onde o destino padrão é `/painel` — uma rota protegida (exige sessão ativa e assinatura). O fluxo gerenciado do Lovable Cloud exige que a URL de retorno seja pública (a origem do app ou uma rota pública de callback). Como o retorno cai numa rota protegida, o handshake do popup/preview não é concluído e o cliente fica aguardando até dar timeout.

Isso também afeta o consentimento OAuth (`/.lovable/oauth/consent`), que envia o usuário para `/auth?next=...` — hoje esse `next` vai para o `redirect_uri` do Google, então o mesmo timeout ocorre no fluxo de conexão de clientes externos (MCP).

## O que vou mudar

1. **`src/routes/auth.tsx`**
   - Passar `redirect_uri: window.location.origin` (URL pública) no `lovable.auth.signInWithOAuth("google", ...)`.
   - Guardar o destino pretendido (`next`) separadamente em `sessionStorage`, validado como caminho relativo same-origin.
   - Após o retorno, só navegar para o destino quando a sessão estiver confirmada (`getSession`/`onAuthStateChange`), em vez de redirecionar imediatamente.
2. **Retomada do destino** — ao carregar `/auth` (ou a origem) com sessão já ativa, ler o destino salvo, limpá-lo e navegar para ele. Isso preserva o retorno ao consentimento OAuth (`/.lovable/oauth/consent?authorization_id=...`) depois do login com Google.
3. **Sem mudanças** no login por e-mail/senha, no RBAC, na verificação de assinatura ou no restante do painel.

## Como testar no preview

1. Abrir `/auth` deslogado e clicar em "Continuar com Google" — deve autenticar e cair no painel sem timeout.
2. Abrir `/painel` deslogado, ser redirecionado para `/auth`, entrar com Google — deve voltar para `/painel`.
3. Abrir `/.lovable/oauth/consent?authorization_id=teste` deslogado, entrar com Google — deve retornar à mesma URL de consentimento.
