import { createFileRoute } from '@tanstack/react-router'
import RouteComponent from '@/features/printLogs'

export const Route = createFileRoute('/dashboard/print-logs')({
  component: RouteComponent,
})
