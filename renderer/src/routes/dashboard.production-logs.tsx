import { createFileRoute } from '@tanstack/react-router';
import RouteComponent from '@/features/productionLogs';

export const Route = createFileRoute('/dashboard/production-logs')({
  component: RouteComponent,
});
