import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard/budgets')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/dashboard/budgets"!</div>
}
