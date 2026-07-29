## Objetivo

Criar uma tela **WhatsApp — Agentes** parecida com as imagens do iuzer, onde você adiciona vários agentes (cada um com um número próprio), escaneia o QR Code e conecta de verdade via **Evolution API**.

## Como vai funcionar

```text
Tela "WhatsApp"  →  [+ Adicionar agente]
                        ↓
          Tipo do agente: Julia (feminino) / João (masculino)
          Número do WhatsApp: (00) 00000-0000
                        ↓
        [Adicionar e gerar QR Code] → QR na tela → escanear no celular
                        ↓
     Agente "Conectado" na lista, respondendo com o cérebro da Julia
```

Cada agente vira uma **instância própria** no seu servidor Evolution. Todos usam o mesmo motor de IA (`runAgent`), mesmo histórico e mesmas ferramentas Bemp — muda só a voz/persona e o número.

## Pré-requisito fora do app

A Evolution API precisa rodar num servidor seu (VPS/Docker). Vou pedir com segurança:
- `EVOLUTION_API_URL` (ex.: `https://evo.seudominio.com`)
- `EVOLUTION_API_KEY` (chave global do Evolution)

Se ainda não tiver o servidor, te passo o `docker-compose.yml` pronto na implementação.

## O que vou construir

### 1. Banco
Tabela `wa_agentes`: `id`, `nome`, `tipo` (`feminino` | `masculino`), `telefone`, `instancia`, `status` (`aguardando_qr` | `conectado` | `desconectado`), `criado_em`. Com RLS restrita a admin/operador autorizado e GRANTs.

### 2. Tela nova `/agentes-whatsapp`
- Cabeçalho "WhatsApp — Agentes e envio de mensagens automáticas".
- Botão **Adicionar agente** no topo.
- Estado vazio com o card tracejado e o botão **Adicionar agente WhatsApp** (igual às imagens).
- Modal (bottom sheet no celular): seletor **Tipo do agente** (Agente feminino / Agente masculino), caixa informativa, campo **Número do WhatsApp** com máscara, botões **Cancelar** e **Adicionar e gerar QR Code**.
- Lista de agentes com nome, número, selo de status e ações **Ver QR**, **Reconectar**, **Desconectar**, **Remover**.
- Modal de QR Code com atualização automática do status a cada 5s até conectar.
- Estilo seguindo o tema atual do sistema (Blush & Lavender), não o roxo do iuzer.

### 3. Backend
- `src/lib/evolution.server.ts`: criar instância, obter QR (base64), status, logout, enviar texto/áudio.
- `src/lib/agentes-whatsapp.functions.ts`: server functions autenticadas (`assertAdmin`/permissão) para criar, listar, gerar QR, reconectar, desconectar e remover agentes.
- `src/routes/api/public/whatsapp-evolution.ts`: webhook que recebe mensagens do Evolution, valida a `apikey`, identifica o agente pela instância e reusa o pipeline atual (transcrição de áudio, `runAgent`, histórico, resposta em texto ou áudio).
- Persona por tipo: agente feminino = Julia (voz `shimmer`); agente masculino = nome masculino + voz masculina no TTS.

### 4. Menu
Item **WhatsApp — Agentes** na sidebar, junto das configurações de WhatsApp.

## Fora do escopo

Não vou mexer no tema geral do app, na navegação inferior nem na página de checkout do link enviado — conforme você escolheu, só a tela de agentes.
