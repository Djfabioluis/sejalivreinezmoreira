# Plan - Follow-up Evolution 404 Correction

Correcting the 404 error in CRM Follow-up messages by unifying the Evolution API transport layer and enforcing strict unit-to-instance mapping.

## Proposed Changes

### 1. Enhance Observability in `src/lib/evolution.server.ts`
- Modify `evoFetch` to capture and return full request/response context (URL, method, headers without keys, status, full body).
- Update `logEvent` usage in `sendEvolutionText` to include these comprehensive details.
- Add `[FOLLOWUP_EVOLUTION_REQUEST]` and `[FOLLOWUP_EVOLUTION_RESPONSE]` identifiers to logs.

### 2. Implement Instance Validation in `src/lib/evolution/outbound-resolver.server.ts`
- Add `checkInstanceStatus` function to verify existence and connection status directly with the Evolution API.
- Update `resolveOutboundInstanceForUnit` to perform this validation, returning specific failure reasons (`EVOLUTION_INSTANCE_NOT_FOUND`, `EVOLUTION_INSTANCE_DISCONNECTED`).

### 3. Unify Transport Layer in `src/lib/crm/followup-processor.server.ts`
- Ensure the worker uses `sendEvolutionText` from `src/lib/evolution.server.ts` (the same function used by the AI chat).
- Refine the instance resolution logic to strictly follow the `Unit -> Agent -> Instance` mapping.
- Populate `last_error` with full HTTP diagnostics when a failure occurs.

### 4. Direct Test and Automatic Validation
- Create a temporary server function/test script to perform a "Direct Send" using the resolved instance for a unit.
- Verify 200/201 response and Message ID persistence.

## Technical Details
- **Error Mapping**: Map 404s to specific reasons: `EVOLUTION_INSTANCE_NOT_FOUND` (if instance name is wrong) or `EVOLUTION_ENDPOINT_NOT_FOUND` (if path is wrong).
- **URL Construction**: Validate that `encodeURIComponent(instance)` is correctly used and that we are using `instanceName` instead of an internal ID.
- **Diagnostics**: Ensure `crm_followups.metadata.last_error` stores the full response body for visibility in the dashboard.

## User Review Required
> [!IMPORTANT]
> The fix assumes that the Evolution API instances are named following the `agente-XXXXXXXX` pattern in the `wa_agentes` table. If the API expects internal UUIDs in the URL, this will be identified during the audit step.
