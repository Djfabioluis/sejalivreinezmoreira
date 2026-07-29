## Objetivo
Garantir que toda a comunicação do sistema (IA, dashboard, notificações e configurações) use a palavra **cliente** em vez de **paciente**.

## Estado atual verificado
- O prompt principal da IA (`DEFAULT_SYSTEM_PROMPT` em `src/lib/chat.server.ts`) já foi refatorado e usa exclusivamente "cliente".
- O dashboard (`src/routes/_authenticated/painel.tsx`) e os componentes relacionados também já usam "cliente".
- As únicas ocorrências restantes de "paciente" estão em uma migration antiga (`supabase/migrations/20260725175448_ea1ef850...`), que é histórica e não deve ser alterada.

## Plano de ação
1. **Varredura final no código-fonte**
   - Re-executar busca por "paciente/Paciente/pacientes/Pacientes" em `src/` e arquivos de configuração ativos.
   - Verificar templates de mensagens, notificações e configurações de boas-vindas.

2. **Verificação no banco de dados**
   - Consultar registros dinâmicos que possam conter "paciente":
     - `base_conhecimento` (prompts, instruções, FAQs)
     - `configuracoes_boas_vindas` (mensagem de saudação)
     - `agendamentos_notif` / templates de lembrete (se houver texto editável)
   - Se encontrar, atualizar os registros para "cliente".

3. **Atualização do prompt de sistema (se necessário)**
   - Garantir que `DEFAULT_SYSTEM_PROMPT` e qualquer prompt carregado do banco usem "cliente".
   - Instruir explicitamente a IA: "Sempre se refira à pessoa atendida como cliente, nunca paciente."

4. **Não alterar migrations históricas**
   - Manter `supabase/migrations/20260725175448_ea1ef850...` intacto, pois representa o estado do schema/prompt em um momento do passado.

## Resultado esperado
- Nenhuma ocorrência ativa de "paciente" no código ou no banco.
- A IA "Julia" se referirá sempre a "cliente" em todas as interações.
- Dashboard, notificações e configurações alinhados com a terminologia do salão.

## Tarefas técnicas
- [ ] Busca final por "paciente" em `src/` e configurações.
- [ ] Query no banco para identificar registros dinâmicos com "paciente".
- [ ] Atualizar registros do banco e/ou código-fonte conforme encontrado.
- [ ] Typecheck e build para validar.
- [ ] Testar mensagem da IA no preview para confirmar uso de "cliente".