## Objetivo

Rodar **dois canais WhatsApp em paralelo**:
- **Meta Cloud API** (já ativa) — canal oficial.
- **Evolution API** (nova) — sessão via QR code do seu número pessoal, hospedada por você fora do app.

A Julia responde em ambos com o mesmo cérebro (`runAgent`), mesmo histórico (`wa_conversas`) e mesmas ferramentas Bemp. Só o transporte muda.

## Arquitetura

```text
Cliente WhatsApp
      │
      ├── número Meta ──► graph.facebook.com ──► /api/public/whatsapp        (já existe)
      │
      └── número pessoal ──► seu servidor Evolution ──► /api/public/whatsapp-evolution  (novo)
                                    ▲
                                    │ nossa tela envia comandos (start/QR/status/send)
                                    └── https://SEU-EVOLUTION.com/instance/*
```

O servidor Evolution vive **fora** do Lovable (VPS, Docker, Railway, Coolify — qualquer host Node). O app só fala HTTP com ele.

## Pré-requisito fora do Lovable

Você precisa ter uma instância Evolution rodando e me passar 3 dados:
1. `EVOLUTION_API_URL` — ex.: `https://evo.seudominio.com`
2. `EVOLUTION_API_KEY` — chave global definida no `.env` do Evolution
3. `EVOLUTION_INSTANCE_NAME` — nome da instância (ex.: `salao-seja-livre`)

Se você ainda não tem, o caminho mais rápido é Docker em VPS (~R$ 25/mês na Hostinger/Contabo). Posso te passar o `docker-compose.yml` pronto quando aprovar o plano.

## Mudanças no app (o que vou implementar)

### 1. Segredos
Registrar `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE_NAME` via tool de secrets (formulário seguro, sem eu ver o valor).

### 2. Camada de integração — 2 arquivos server-only
- `src/lib/evolution.server.ts` — cliente HTTP com funções: `startInstance()`, `getQrCode()`, `getConnectionStatus()`, `sendText(to, body)`, `sendAudioMp3(to, buffer)`, `downloadMedia(mediaId)`, `logout()`. Usa `sanitizeCustomerText` igual ao envio Meta.
- `src/lib/evolution.functions.ts` — server functions autenticadas com `assertAdmin`: `getEvolutionStatus`, `startEvolutionInstance`, `disconnectEvolution`, `refreshEvolutionQr`.

### 3. Webhook público
- `src/routes/api/public/whatsapp-evolution.ts` — recebe `POST` do Evolution (evento `messages.upsert`), valida um header `apikey` contra `EVOLUTION_API_KEY`, normaliza a mensagem para o mesmo formato do webhook Meta e reusa exatamente o pipeline atual:
  - `loadHistory(phone)` → `runAgent()` → `saveHistory()` → responde texto ou áudio (mesmo TTS via `synthesizeSpeechMp3`, mesmo `transcribeAudio` para voice notes).
  - Prefixo do phone armazenado (`evo:<numero>`) para não colidir com histórico Meta do mesmo número.

### 4. Tela de configuração
- `src/routes/_authenticated/configuracao-whatsapp-web.tsx` — nova aba "WhatsApp Web (Evolution)" espelhando o layout da tela Meta:
  - Card de status (conectado/desconectado/aguardando QR).
  - Botão **"Gerar QR code"** que mostra o QR (base64 devolvido pelo Evolution) para escanear no celular → Aparelhos conectados.
  - URL do webhook para colar na config da instância Evolution (`https://.../api/public/whatsapp-evolution`).
  - Botão **"Desconectar sessão"**.
  - Polling de status a cada 15 s enquanto aguarda QR; 60 s quando conectado.

### 5. Menu
- Adicionar item "WhatsApp Web" na `app-sidebar.tsx` abaixo de "Configuração do WhatsApp".

### 6. Envio de lembretes/confirmações
- `src/lib/whatsapp-send.server.ts` ganha `sendViaBestChannel(to, body)`: tenta Meta primeiro, cai pra Evolution se Meta falhar/estiver offline (útil pro seu caso de manter os dois). Alternativa: eu adiciono um seletor de canal padrão na tela — me diga qual você prefere.

## O que **não** muda
- Nada nos prompts, base de conhecimento, RBAC, painel, cross-sell, Bemp, reagendamento.
- Webhook Meta continua funcionando exatamente como está.

## Riscos que você precisa saber
- **Banimento do número**: o WhatsApp detecta bots em Web/Multi-Device e pode banir o número pessoal sem aviso. Não use um número que você precise.
- **Sessão cai**: se o celular ficar sem internet por muitos dias, o QR precisa ser reescaneado. A tela avisa quando isso acontece.
- **Custo do VPS**: ~R$ 25–50/mês fora do Lovable — não tem como rodar dentro.
- **Áudio (voice notes)**: Evolution devolve áudio em `.ogg opus`; a transcrição via Gemini já aceita esse formato, então funciona sem mudança.

## Detalhes técnicos (referência)

Endpoints Evolution v2 usados:
- `POST /instance/create` — cria instância (idempotente).
- `GET  /instance/connect/{instance}` — retorna QR (base64) ou `state: "open"` se já conectado.
- `GET  /instance/connectionState/{instance}` — status.
- `POST /message/sendText/{instance}` — `{ number, text }`.
- `POST /message/sendWhatsAppAudio/{instance}` — áudio (base64 mp3/ogg).
- `POST /chat/getBase64FromMediaMessage/{instance}` — baixar mídia recebida.
- `DELETE /instance/logout/{instance}`.

Header em todas: `apikey: ${EVOLUTION_API_KEY}`.

Webhook do Evolution configurado para: `url = https://sejalivreinezmoreira.lovable.app/api/public/whatsapp-evolution`, eventos `MESSAGES_UPSERT`, `CONNECTION_UPDATE`.

## Próximo passo se aprovar

1. Você me confirma se já tem servidor Evolution rodando (ou pede o `docker-compose.yml`).
2. Registro os 3 segredos via formulário seguro.
3. Implemento os arquivos acima em uma rodada e te entrego a nova aba pronta pra escanear o QR.
