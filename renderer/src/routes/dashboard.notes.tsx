import { createFileRoute } from '@tanstack/react-router'
import RouteComponent from '@/features/notes'

export const Route = createFileRoute('/dashboard/notes')({
  component: RouteComponent,
})
