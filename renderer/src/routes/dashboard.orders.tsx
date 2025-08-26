import { createFileRoute } from '@tanstack/react-router'
import OrdersPage from '@/features/orders'

export const Route = createFileRoute('/dashboard/orders')({
  component: OrdersPage
})
