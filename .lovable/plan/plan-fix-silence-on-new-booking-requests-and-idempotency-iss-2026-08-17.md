# Plan - Fix silence on new booking requests and idempotency issues

Correcting the silence regression where new booking requests were ignored due to stale terminal states and ensuring strict idempotency to prevent duplicate outbound messages.

## User Review Required

> [!IMPORTANT]
> The fix for "silence" involves more aggressive session resets. If a user was in the middle of a confirmation and suddenly says "I want to book X", the current pending confirmation will be wiped to prioritize the new request.

- **Trace Audit**: The 18:43 message ("Quero marcar manicure para amanhã de manhã") was processed but resulted in silence because the system was stuck in a stale `AWAITING_CONFIRMATION` state from a previous session and the new intent didn't trigger a full reset.
- **Root Cause**: `isSessionReset` was too conservative, and the agent flow was short-circuiting to "Pending Confirmation Reminder" even when a new service intent was present.

## Proposed Changes

### 1. Booking Context & Reset Logic
- **File**: `src/lib/booking/context.ts`
- **Action**: Strengthen `isNewBookingIntent` regex to capture more natural variations.
- **Action**: Update `isSessionReset` to clear `awaitingConfirmation` and `selectedSlot` if a new service intent is detected, regardless of the previous state.

### 2. Agent Flow Stabilization
- **File**: `src/lib/evolution/agent.server.ts`
- **Action**: Modify the `AWAITING_CONFIRMATION` block to check for `isNewBookingIntent` and abort the reminder if a new request is detected.
- **Action**: Ensure `extracted._isReset` flag is correctly handled to force the flow into service/date resolution instead of terminal states.

### 3. Idempotency & Duplicate Prevention
- **File**: `src/lib/evolution/processor.server.ts` & `src/lib/evolution/idempotency.server.ts`
- **Action**: Ensure `claimEvent` is strictly instance+messageId bound.
- **Action**: Harden `claimResponseSlot` to ensure failures in the agent flow don't leave the conversation locked or silent on retries.

## Technical Details
- **Regex Update**: `/\b(?:quero|preciso|gostaria|agendar|marcar|fazer|hoje|amanh[ãa]|queria|tem|horario|vaga)\b/i`
- **State Machine**: Prioritize `nextRequiredSlot` over `awaitingConfirmation` reminder when `isNewBookingIntent` is true.
- **Trace ID**: Maintain consistency of `traceId` across the entire delivery chain (Inbound -> Agent -> Outbound).

## Verification Plan
- **Automated Tests**: Run `vitest` on `booking-reset.test.ts` (to be created) simulating the 18:43 scenario.
- **Trace Verification**: Check logs for `BOOKING_SESSION_RESET_DETECTED` and `NEXT_SLOT_DETERMINED` for new intents.
