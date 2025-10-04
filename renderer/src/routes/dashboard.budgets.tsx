import { createFileRoute } from '@tanstack/react-router'
import RouteComponent from '@/features/budgets'

export const Route = createFileRoute('/dashboard/budgets')({
  component: RouteComponent,
})

