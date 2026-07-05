import { createFileRoute } from '@tanstack/react-router';
import ShoppingListPage from '@/features/shoppingList';

export const Route = createFileRoute('/dashboard/shopping-list')({
  component: ShoppingListPage,
});
