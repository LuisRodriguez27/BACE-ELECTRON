import { createFileRoute } from '@tanstack/react-router'
import ConfigurationsPage from '@/features/configurations'

export const Route = createFileRoute('/dashboard/configurations')({
  component: ConfigurationsPage
})
