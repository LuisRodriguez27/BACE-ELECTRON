import { createFileRoute } from '@tanstack/react-router';
import CreditsPage from '@/features/credits';

export const Route = createFileRoute('/dashboard/credits')({
  component: CreditsPage,
});

