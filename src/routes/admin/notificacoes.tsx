import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/notificacoes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/notificacoes"!</div>
}
