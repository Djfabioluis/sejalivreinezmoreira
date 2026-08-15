# Plano de Correção Determinística — Consulta de Catálogo

Localizada a causa raiz: o Gemini não invocou a tool `list_services` mesmo após a normalização de "mão" para "manicure", resultando em perguntas genéricas. Vou implementar a chamada determinística no backend antes do processamento da IA.

## Mudanças

### Backend
1.  **Refatorar `runAgent` em `src/lib/chat.server.ts`**:
    *   Detectar se `bookingContext.serviceText` (intenção normalizada como "manicure") está presente, mas `serviceId` está ausente.
    *   Nesse caso, invocar `BempService.listServices(effectiveUnitId)` determinísticamente antes de chamar o Gemini.
    *   Aplicar a lógica de resolução de serviço (se houver 1 match exato, preencher `serviceId`; se houver múltiplos, marcar para o Gemini apresentar as opções).
    *   Garantir que o `effectiveUnitId` utilizado seja sempre o da instância inbound atual para evitar contaminação.

2.  **Ajustar `BookingContext`**:
    *   Garantir que o estado de "Catálogo Carregado" seja passado corretamente para o prompt do Gemini para que ele saiba que as opções fornecidas são exaustivas.

## Detalhes Técnicos

*   **Arquivo**: `src/lib/chat.server.ts`
*   **Função**: `runAgent`
*   **Lógica**:
    ```typescript
    if (bookingContext.serviceText && !bookingContext.serviceId && effectiveUnitId) {
      const services = await BempService.listServices(effectiveUnitId);
      // ... lógica de filtragem por intenção (ex: "manicure") ...
      // ... patch no customerContext se resolvido ou ambíguo ...
    }
    ```

## Validação
*   Executar script de teste automatizado simulando "quero fazer a mão hoje" em cada unidade.
*   Verificar logs para confirmar que `LIST_SERVICES_CALLED = SIM` ocorre antes do `AI_REQUEST_STARTED`.
*   Confirmar que o Gemini não inventa nomes e usa apenas o catálogo real.
