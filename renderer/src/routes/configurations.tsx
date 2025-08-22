import { createFileRoute } from '@tanstack/react-router'
import ConfigurationsPage from '@/features/configurations'

export const Route = createFileRoute('/configurations')({
  component: ConfigurationsPage
})
