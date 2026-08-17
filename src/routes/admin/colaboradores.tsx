import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/colaboradores')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/colaboradores"!</div>
}
