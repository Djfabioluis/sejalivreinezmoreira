# Plano de Correção: Busca de Agendamentos BEMP

A busca de agendamentos reais da BEMP para o cliente "Fabio Luis" está falhando com erro 406 "Customer not found". O sistema identifica corretamente a intenção de cancelamento, mas não consegue localizar o registro na API para prosseguir com a confirmação.

## Problema Identificado
A API de webhook da BEMP (`/webhooks/whatsapp_schedule`) é extremamente sensível à formatação do telefone. Testes indicam que:
1. Ela exige obrigatoriamente `phone_country_code`, `phone_area_code` e `phone_number`.
2. O telefone "5541992495561" fornecido pelo WhatsApp não está sendo reconhecido em nenhuma das variações comuns (8 ou 9 dígitos, com ou sem prefixo).
3. A busca global por `salon_id` também é bloqueada sem um telefone válido.

## Ações Propostas

### 1. Sistema de Busca Multi-Variante (Fallback de Busca)
Modificar o `BempService.listCustomerAppointments` para tentar automaticamente múltiplas combinações de telefone caso a primeira falhe ou retorne vazio.
- Variação 1: 55 + 41 + 992495561 (Original)
- Variação 2: 55 + 41 + 92495561 (Sem o 9 adicional)
- Variação 3: 55 + 041 + 992495561 (DDD com zero)
- Variação 4: Buscar sem o código do país (alguns sistemas registram localmente).

### 2. Busca por Nome (Segunda Linha de Defesa)
Caso a busca por telefone falhe, implementaremos uma busca via `/api/customers?q=Fabio+Luis` (se disponível) ou listagem por data na unidade para cruzar com o nome do cliente.

### 3. Melhoria no Log de Diagnóstico
Adicionar logs específicos no `cancel-handler.ts` para capturar exatamente qual variação de telefone a BEMP rejeitou, permitindo um ajuste fino imediato.

## Detalhes Técnicos
- **Arquivo:** `src/lib/bemp-service.server.ts`
- **Função:** `listCustomerAppointments` e `findCustomerByPhone`.
- **Lógica:** Implementar um loop de `try/catch` interno para as variações de telefone antes de desistir.

---
**Próximo Passo:** Implementar o loop de busca multi-variante e testar novamente com o telefone real do Fabio Luis.
