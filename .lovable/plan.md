# Plan - Julia AI Service Hours Configuration

Implement a per-unit configuration for Julia AI service hours to control when she responds to customers on WhatsApp.

## User Review Required

> [!IMPORTANT]
> - New database table `wa_julia_service_hours` will be created.
> - A new column `timezone` will be added to the `wa_agentes` table (or used as fallback if not present).
> - Julia will only respond during configured hours if the feature is enabled.

- **Proposed deterministic message**: "Olá 💜 Nosso atendimento com a Julia está encerrado neste momento. Nosso próximo horário de atendimento é {{dia}} a partir das {{horario}}. Sua mensagem foi recebida e você pode continuar falando comigo quando o atendimento estiver disponível. ✨"

## Technical Details

### 1. Database Schema
- **Table**: `wa_julia_service_hours`
  - `id` (uuid, PK)
  - `unidade_id` (text, FK to bemp unit, unique with day_of_week)
  - `day_of_week` (int, 0-6, 0=Sunday)
  - `is_active` (boolean)
  - `opening_time` (time, HH:mm)
  - `closing_time` (time, HH:mm)
  - `created_at`, `updated_at`
- **Table Alteration**: `wa_agentes`
  - Add `timezone` (text, default 'America/Sao_Paulo')
  - Add `service_hours_enabled` (boolean, default false)

### 2. Backend Logic
- **New Service**: `src/lib/julia-service-hours.server.ts`
  - `isJuliaWithinServiceHours(unitId, currentDateTime)`: Checks if Julia is open.
  - `getNextJuliaOpening(unitId, currentDateTime)`: Calculates the next opening time.
- **Hook Integration**: `src/lib/evolution/processor.server.ts`
  - Intercept messages before agent processing.
  - Check service hours.
  - Send deterministic "Out of Hours" message if closed (using idempotency to avoid repetition).

### 3. Dashboard UI
- **New Component**: `src/components/julia-service-hours-config.tsx`
  - Form to manage the 7-day schedule.
  - Switch to enable/disable the restriction.
  - Visual status indicator (🟢 Open / ⚪ Closed).
- **Route Integration**: Add the configuration section to `src/routes/_authenticated/agentes-whatsapp.tsx` or a dedicated route if preferred.

### 4. Regression & Verification
- Ensure booking, pricing, and professional flows are unaffected during open hours.
- Verify "Out of Hours" message is only sent once per closed window.
- Verify timezone-aware logic for "hoje" and "amanhã".

## Next Steps
1. Create SQL migration for tables and RLS.
2. Implement backend service hours logic.
3. Integrate with Evolution processor.
4. Build the Dashboard configuration UI.
5. Verification and deployment.
