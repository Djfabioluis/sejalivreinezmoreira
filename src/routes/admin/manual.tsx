import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/manual')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/manual"!</div>
}
