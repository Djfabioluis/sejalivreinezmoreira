import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/configuracoes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/configuracoes"!</div>
}
