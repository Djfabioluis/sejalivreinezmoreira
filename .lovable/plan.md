# Reagendamento no WhatsApp (fluxo da Julia)

## Situação atual (verificada em `src/lib/chat.server.ts`)

- Hoje a IA só sabe **cancelar e depois agendar de novo**: quando o cliente pede reagendar, ela chama `cancel_appointment` e volta para o fluxo de agendamento zero.
- Não existe uma ferramenta `reschedule_appointment` — o cliente perde o vínculo do agendamento original, e há uma janela em que ele fica sem horário caso o novo `create_appointment` falhe.
- O prompt trata "remarcar" só como sugestão pós-cancelamento; palavras-chave como "mudar", "adiar", "antecipar", "trocar horário" não têm gatilho próprio.

## O que muda

Fluxo humanizado e seguro:

1. Cliente pede reagendar / mudar / adiar / antecipar → Julia identifica como intenção de **reagendamento** (não como cancelamento).
2. Se ainda não souber o telefone, pede país/DDD/número.
3. Usa `list_customer_appointments` e mostra os agendamentos futuros ("qual desses você quer mudar?").
4. Pergunta se quer manter o mesmo serviço e unidade (padrão: sim) ou aproveitar para trocar.
5. Pergunta a nova data preferida e usa `list_slots` para oferecer horários.
6. Faz um resumo: "de {data/hora antigo} para {data/hora novo}, mesmo serviço, tudo certo?" e pede confirmação explícita.
7. Só depois da confirmação, executa o reagendamento: **cria o novo agendamento primeiro; se der certo, cancela o antigo**. Se o novo falhar, mantém o antigo e explica o que aconteceu.
8. Confirma o novo horário e dispara a mesma mensagem de confirmação por WhatsApp que os agendamentos normais recebem, registrando em `agendamentos_notif` (para o lembrete de 24h valer para o novo horário).
9. Ao final, oferece ajuda adicional; o cross-sell não é re-oferecido (evita insistência).

## Detalhes técnicos

- Adicionar `reschedule_appointment` em `src/lib/chat.server.ts` (`buildTools`) com input: `old_appointment_id`, telefone, `new_start`, opcionalmente `new_service_id`, `new_salon_id`, `new_professional_id`, `preference_note`. Fluxo interno:
  - Sandbox: devolve resposta simulada, sem tocar na Bemp.
  - Real: `create_appointment` na Bemp → se ok, `DELETE` do `old_appointment_id` → se o DELETE falhar, manter o novo e retornar aviso ("agendamento novo criado, mas cancelamento do antigo pendente — equipe será avisada"); logar para triagem.
  - Enviar mensagem de confirmação WhatsApp reaproveitando o helper já usado no `create_appointment`.
  - Atualizar `agendamentos_notif`: marcar o antigo como cancelado/substituído e inserir linha para o novo (`confirmation_sent_at` preenchido), para o cron de lembretes usar a nova data.
  - Se o cliente escolher profissional específico, aplicar a nota "com preferência" (já existe essa regra).
- Atualizar o `DEFAULT_SYSTEM_PROMPT` (seção "CANCELAMENTO E REMARCAÇÃO"):
  - Separar em duas seções: **REAGENDAMENTO** (primeira opção quando o cliente quer mudar) e **CANCELAMENTO** (quando ele realmente quer desistir).
  - Listar gatilhos: "remarcar", "reagendar", "mudar horário", "adiar", "antecipar", "trocar dia", "empurrar", "passar para".
  - Deixar explícito: **nunca** cancelar antes de ter a nova data confirmada.
  - Manter confirmação explícita ("Confirma mudar de X para Y?") antes de chamar `reschedule_appointment`.
- Sem mudanças de schema — reaproveita `agendamentos_notif` e o cron `lembretes-whatsapp-hourly` já ativo.

## Fora de escopo

- Botão de reagendar no painel do operador.
- Opção "responda 1 para reagendar" dentro do lembrete de 24h.
- Reagendar múltiplos agendamentos de uma vez.
