import { createFileRoute } from '@tanstack/react-router';
import SuppliersPage from '@/features/suppliers';

export const Route = createFileRoute('/dashboard/suppliers')({
  component: SuppliersPage
});
