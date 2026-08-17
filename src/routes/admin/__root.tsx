import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/__root')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/admin/__root"!</div>
}
