import type { ShoppingListItemRow } from '../types/shoppingList';

class ShoppingListItem {
  id: number;
  shopping_list_id: number;
  product_id: number;
  quantity: number;
  purchased: boolean;
  created_by: number | null;
  active: boolean;
  order_id: number | null;
  product_name: string | null;

  constructor({ id, shopping_list_id, product_id, quantity, purchased, created_by, active = true, order_id, product_name }: ShoppingListItemRow) {
    this.id = id;
    this.shopping_list_id = shopping_list_id;
    this.product_id = product_id;
    this.quantity = parseFloat(String(quantity)) || 0;
    this.purchased = purchased === true;
    this.created_by = created_by || null;
    this.active = active;
    this.order_id = order_id || null;
    this.product_name = product_name || null;
  }

  isPurchased(): boolean { return this.purchased === true; }

  toPlainObject() {
    return {
      id: this.id,
      shopping_list_id: this.shopping_list_id,
      product_id: this.product_id,
      quantity: this.quantity,
      purchased: this.purchased,
      created_by: this.created_by,
      active: this.active,
      order_id: this.order_id,
      product_name: this.product_name
    };
  }
}

export default ShoppingListItem;
