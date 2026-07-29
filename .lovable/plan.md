## Ajuste de vocabulário da IA: "salão" em vez de "consultório"

### Objetivo
Corrigir o prompt do sistema da IA (Julia) para que ela se referia ao negócio como "salão" e aos atendimentos como serviços de salão de beleza, mantendo o tom humanizado já configurado.

### Alterações
1. **src/lib/chat.server.ts**
   - No `DEFAULT_SYSTEM_PROMPT`, alterar a abertura:
     - De: "Você é a secretária virtual de um consultório integrado à plataforma Bemp."
     - Para: "Você é a secretária virtual do Salão Seja Livre, integrado à plataforma Bemp."
   - Alterar a descrição de propósito:
     - De: "para agendar consultas e vender planos de assinatura."
     - Para: "para agendar atendimentos e vender planos de assinatura."
   - Revisar o restante do prompt para garantir que não haja outras referências residuais a "consultório" ou "consulta" no sentido médico/clínico.

2. **Verificação opcional**
   - Confirmar que a mensagem de boas-vindas padrão (`DEFAULT_WELCOME` em `src/lib/welcome.functions.ts`) já usa "Salão Seja Livre" (já está correta).

### Critérios de aceitação
- O prompt da IA não contém mais a palavra "consultório".
- O tom continua humanizado, próximo e natural, conforme as regras já existentes.
- Build passa sem erros.