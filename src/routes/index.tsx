import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: () => (
    <div className="p-6 font-mono text-sm whitespace-pre">
      {`DEPLOY_SUCCESS = SIM
READY_FOR_REAL_TEST = SIM`}
    </div>
  )
});
