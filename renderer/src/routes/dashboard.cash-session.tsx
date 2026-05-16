import { createFileRoute } from '@tanstack/react-router';
import CashSessionPage from '@/features/cashSession';

export const Route = createFileRoute('/dashboard/cash-session')({
  component: CashSessionPage,
});
