import type { Supplier, SupplierOrder } from './types';

/**
 * Calculates the total pieces of a supplier order by dynamically finding the quantity column.
 */
export function calculateOrderTotalPieces(
  order: SupplierOrder | null,
  suppliers: Supplier[]
): number {
  if (!order) return 0;

  // Find the supplier for this order to load its columns
  const supplier = suppliers.find(s => s.id === order.supplier_id);
  const columns = supplier?.columns && supplier.columns.length > 0
    ? supplier.columns
    : ['pzas', 'descripción'];

  // Normalize order items
  const items = (order.supplierOrderItems || []).map((i: any) => {
    if (i && i.item_data) return i.item_data;
    return i;
  });

  // Find the column representing the quantity/pieces (case-insensitive)
  const piecesColumnKey = columns.find(col => {
    const lower = col.toLowerCase().trim();
    return lower === 'pzas' || lower === 'pza' || lower === 'pz' || lower === 'cantidad' || lower === 'cant' || lower === 'qty' || lower === 'piezas';
  }) || columns[0];

  // Calculate the total sum of pieces
  return items.reduce((sum, item) => {
    if (!piecesColumnKey) return sum;
    const value = item[piecesColumnKey];
    if (value === undefined || value === null) return sum;
    const parsed = parseFloat(String(value).trim());
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);
}
