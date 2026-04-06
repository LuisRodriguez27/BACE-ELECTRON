import { createFileRoute } from '@tanstack/react-router'
import SimpleOrdersPage from '@/features/simple-orders'

export const Route = createFileRoute('/dashboard/simple-orders')({
  component: SimpleOrdersPage
})

