# Plano de Implementação: CATALOG_ONLY MODE e Proteção Anti-Alucinação

Este plano visa implementar o **CATALOG_ONLY MODE** para garantir que a Julia IA utilize exclusivamente serviços reais retornados pela API BEMP, evitando alucinações de nomes ou modalidades.

## Alterações Propostas

### Backend (Server Logic)

- **Proteção Determinística em `src/lib/chat.server.ts`**:
    - Implementar a flag `CATALOG_ONLY = true`.
    - Refatorar o processamento da resposta do LLM para validar cada serviço mencionado contra o catálogo retornado pela BEMP no mesmo turno (ou persistido no contexto).
    - Adicionar um "Sanitizer" na saída da IA que remove opções de serviços que não possuem um `serviceId` válido e correspondente ao catálogo real.
    - Injetar instruções no System Prompt reforçando que nomes "amigáveis" ou variações não autorizadas pelo catálogo são proibidas.

- **Preservação de Contexto (BookingContext)**:
    - Garantir que `dateIntent` (ex: "hoje") seja persistido e mesclado corretamente durante a fase de seleção de serviços, evitando perguntas redundantes sobre a data.
    - Validar o isolamento de `unitId` em cada chamada de ferramenta (`list_services`, `list_slots`), garantindo que seja sempre igual ao `inboundUnitId`.

- **Normalização de Intenção**:
    - Manter a normalização de "mão" -> "MANICURE" na busca, mas assegurar que o resultado final apresentado ao usuário contenha apenas os nomes exatos do catálogo.

### Validação e Testes

- **Simulação de Auditoria**:
    - Executar simulações internas para as unidades Ventura, Boulevard e Centro.
    - Gerar logs detalhados (via `evo_trace_logs`) comprovando o isolamento das unidades e a ausência de alucinações.

## Detalhes Técnicos

- **Mecanismo de Assert**:
    - Antes de gerar o texto final para o WhatsApp, o sistema comparará a lista de serviços detectada no texto da IA com o array retornado pela ferramenta `list_services`.
    - Se a IA sugerir "Manicure Francesinha" e no catálogo houver apenas "Manicure", o sistema filtrará ou corrigirá a sugestão.

- **Isolamento de Unidades**:
    - O `bookingContext` será validado rigorosamente contra a instância de origem (`inboundUnitId`) antes de qualquer chamada à API externa.

Aguardando aprovação para iniciar a implementação conforme as regras absolutas estabelecidas.
