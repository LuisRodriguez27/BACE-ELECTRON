import type { ShoppingListRow, ShoppingListItemRow, ShoppingListStatus } from '../types/shoppingList';
import ShoppingListItem from './shoppingListItem';

class ShoppingList {
  id: number;
  opening_date: string;
  closing_date: string | null;
  status: ShoppingListStatus;
  notes: string | null;
  created_by: number | null;
  items: InstanceType<typeof ShoppingListItem>[];

  constructor({ id, opening_date, closing_date, status, notes, created_by, items = [] }: ShoppingListRow & { items?: ShoppingListItemRow[] }) {
    this.id = id;
    this.opening_date = opening_date;
    this.closing_date = closing_date || null;
    this.status = status;
    this.notes = notes || null;
    this.created_by = created_by || null;
    this.items = items.map((i) => new ShoppingListItem(i));
  }

  isOpen(): boolean { return this.status === 'open'; }
  isClosed(): boolean { return this.status === 'closed'; }

  getPendingItemsCount(): number {
    return this.items.filter((i) => i.active && !i.isPurchased()).length;
  }

  toPlainObject() {
    return {
      id: this.id,
      opening_date: this.opening_date,
      closing_date: this.closing_date,
      status: this.status,
      notes: this.notes,
      created_by: this.created_by,
      items: this.items.map((i) => i.toPlainObject())
    };
  }
}

export default ShoppingList;
