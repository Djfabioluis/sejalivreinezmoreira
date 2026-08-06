# ADR 001: WhatsApp Agent Manager

## Status
Proposto

## Contexto
Atualmente, as configurações de agentes de WhatsApp e instâncias da Evolution API são feitas de forma manual ou fragmentada. Precisamos de um fluxo unificado e automatizado para facilitar a escala da plataforma. Além disso, as instruções de desenvolvimento estavam indevidamente armazenadas no código da Landing Page.

## Decisão
Implementar o módulo "Gerenciador de Agentes WhatsApp" como uma camada centralizada de controle. Mover toda a documentação técnica para a pasta `docs/` e limpar a Landing Page de metadados técnicos.

## Alternativas Consideradas
- Continuar com configurações via variáveis de ambiente/manuais (Inviável para SaaS).
- Utilizar Supabase Edge Functions (Preferimos TanStack Server Functions para consistência).

## Impactos
- Melhor experiência do usuário (UX) no onboarding.
- Maior controle sobre as instâncias da Evolution API.
- Código mais limpo e organizado.
