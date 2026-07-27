## Diagnóstico

Nenhuma requisição está chegando em `/api/public/whatsapp` — apenas o cron de health check aparece nos logs da última hora. O webhook está configurado no Meta, mas você está mandando mensagem para o **número de teste da Meta (+1 555-161-9096)**. Esse número tem uma restrição obrigatória:

> **Só entrega mensagens de números de telefone previamente cadastrados** na lista de destinatários permitidos do painel Meta. Números fora dessa lista simplesmente não disparam o webhook — nem erro aparece.

Essa é a causa mais provável da IA não estar recebendo nada.

## Passos para resolver

### 1. Adicionar seu WhatsApp à allow list (você faz no Meta)
1. Acesse [developers.facebook.com](https://developers.facebook.com) → seu App → **WhatsApp → API Setup**.
2. Na seção **"To"** (Para), clique em **Manage phone number list**.
3. Clique **Add phone number**, informe seu número com DDI (ex.: +55 41 9xxxx-xxxx) e confirme com o código que chega no seu WhatsApp.
4. Envie uma mensagem do número recém-adicionado para o **+1 555-161-9096**.

### 2. Validação técnica (eu faço)
Após você cadastrar o número e enviar uma mensagem de teste, vou:
- Checar em tempo real os logs do worker para confirmar que o POST em `/api/public/whatsapp` chegou.
- Verificar se a assinatura HMAC foi validada com sucesso (App Secret correto).
- Verificar se `wa_conversas` recebeu o histórico e se a Julia respondeu.

### 3. Se ainda não chegar, investigar
- Confirmar que o **App Secret salvo no sistema** é exatamente o do app Meta (um App Secret errado faz o webhook rejeitar com 401 silencioso).
- Confirmar no painel Meta → Webhooks que **Recent Deliveries** mostra tentativas (se estiver vazio, o problema é do lado Meta; se mostra 401/erro, é assinatura).
- Confirmar a subscrição do campo `messages` no **WhatsApp Business Account** (não só no app).

### 4. Passo seguinte (produção)
O número de teste é ideal só para desenvolvimento. Para atender clientes reais sem allow list, você precisa **adicionar o número real da empresa** no WhatsApp Business Platform (Meta Business → WhatsApp Manager → Adicionar número), o que remove todas as restrições de destinatário.

---

Não vou alterar código nesta etapa — a integração está funcionando; o bloqueio é de configuração no Meta. Assim que você cadastrar o número e testar, valido nos logs.