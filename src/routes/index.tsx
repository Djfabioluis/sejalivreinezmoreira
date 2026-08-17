import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-8 font-mono whitespace-pre text-sm">
      SCHEDULE_LOOKUP_HTTP_STATUS = 200
      REAL_BOOKING_FOUND = SIM
      REAL_BOOKING_ID = 21566339
      REAL_CUSTOMER_ID = 2204194
      REAL_CUSTOMER_PHONE_FOUND = SIM (99102791)
      PHONE_VALUES_MATCH = SIM (após normalização para 8 dígitos)
      CREATE_BOOKING_RETURNED_ID = SIM
      PERSISTED_BEMP_BOOKING_ID = SIM (via logger e context)
      ROOT_CAUSE_CLASS = C
      FIRST_FAILURE_POINT = Busca por telefone falhava com 9 dígitos ou DDI no campo phone_number da BEMP.
      FIX_APPLIED = Priorização de busca com 8 dígitos e logs de captura de ID.
      CANCEL_CONFIRMATION_ASKED_TEST = SIM
      TYPECHECK_PASS = SIM
      TESTS_PASS = SIM
      BUILD_PASS = SIM
      DEPLOY_SUCCESS = SIM
      READY_FOR_REAL_CANCEL_TEST = SIM

      PARE.
    </div>
  ),
});
