import { createFileRoute } from '@tanstack/react-router'
import SimpleOrdersPage from '@/features/simpleOrders'

export const Route = createFileRoute('/dashboard/simple-orders')({
  component: SimpleOrdersPage
})

