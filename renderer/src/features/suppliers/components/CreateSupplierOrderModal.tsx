import React, { useState, useEffect } from 'react';
import { X, Loader, Plus, Trash2, Calendar, FileText, CheckCircle, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { SuppliersApiService } from '../SuppliersApiService';
import type { Supplier, SupplierOrder } from '../types';
import { formatDateMX, todayDateInputMX, preserveTimeOrStartOfDay } from '@/utils/dateUtils';
import { OrdersApiService } from '@/features/orders/OrdersApiService';

interface CreateSupplierOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: SupplierOrder) => void;
  suppliers: Supplier[];
  initialOrderId?: number | null;
}

const CreateSupplierOrderModal: React.FC<CreateSupplierOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  suppliers,
  initialOrderId
}) => {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientOrders, setClientOrders] = useState<any[]>([]);

  // Form fields
  const [supplierId, setSupplierId] = useState<number>(0);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderDate, setOrderDate] = useState<string>(todayDateInputMX());
  const [status, setStatus] = useState<string>('pendiente');
  const [notes, setNotes] = useState<string>('');
  const [total, setTotal] = useState<number>(0);

  // Dynamic items table state
  const [items, setItems] = useState<Record<string, any>[]>([{}]);
  
  // Historical items for autocomplete
  const [previousItems, setPreviousItems] = useState<Record<string, any>[]>([]);
  const [activeCell, setActiveCell] = useState<{ rowIndex: number; colKey: string; value: string } | null>(null);

  // Fetch client orders for linkage
  useEffect(() => {
    if (isOpen) {
      OrdersApiService.findAll()
        .then((data) => setClientOrders(data || []))
        .catch((err) => console.error('Error fetching client orders:', err));
    }
  }, [isOpen]);

  // Set orderId if initialOrderId is present
  useEffect(() => {
    if (isOpen && initialOrderId) {
      setOrderId(Number(initialOrderId));
    }
  }, [isOpen, initialOrderId]);

  // Load previous items and reset table rows when supplier changes
  useEffect(() => {
    if (supplierId > 0) {
      SuppliersApiService.getPreviousItems(supplierId)
        .then((data) => {
          // Normalize items if they are stored in item_data
          const normalized = data.map((item: any) => {
            if (item && item.item_data) return item.item_data;
            return item;
          });
          setPreviousItems(normalized);
        })
        .catch((err) => console.error('Error fetching historical items:', err));

      // Reset dynamic table
      const supplier = suppliers.find(s => s.id === supplierId);
      const cols = supplier?.columns && supplier.columns.length > 0 ? supplier.columns : ['pzas', 'descripción'];
      const initialRow: Record<string, any> = {};
      cols.forEach(col => {
        initialRow[col] = '';
      });
      setItems([initialRow]);
    } else {
      setPreviousItems([]);
      setItems([{}]);
    }
  }, [supplierId, suppliers]);

  const selectedSupplier = suppliers.find(s => s.id === supplierId);
  const columns = selectedSupplier?.columns && selectedSupplier.columns.length > 0
    ? selectedSupplier.columns
    : ['pzas', 'descripción'];

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    columns.forEach(col => {
      newRow[col] = '';
    });
    setItems([...items, newRow]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length === 1) {
      const clearedRow: Record<string, any> = {};
      columns.forEach(col => {
        clearedRow[col] = '';
      });
      setItems([clearedRow]);
    } else {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleCellChange = (rowIndex: number, colKey: string, value: string) => {
    const updated = [...items];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: value };
    setItems(updated);
    setActiveCell({ rowIndex, colKey, value });
  };

  const handleCellFocus = (rowIndex: number, colKey: string, value: string) => {
    setActiveCell({ rowIndex, colKey, value });
  };

  const handleSelectSuggestion = (rowIndex: number, colKey: string, val: string) => {
    const updated = [...items];
    updated[rowIndex] = { ...updated[rowIndex], [colKey]: val };
    setItems(updated);
    setActiveCell(null);
  };

  // Filter suggestions based on typed input in the active cell
  const getFilteredSuggestions = () => {
    if (!activeCell) return [];
    const { colKey, value } = activeCell;
    const searchVal = (value || '').toLowerCase();

    const matches = previousItems
      .map(item => String(item[colKey] || '').trim())
      .filter(val => {
        if (val === '') return false;
        if (!searchVal) return true;
        return val.toLowerCase().includes(searchVal);
      });

    // Filter unique values and return top 5
    return Array.from(new Set(matches)).slice(0, 5);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierId <= 0) {
      toast.error('Por favor, selecciona un proveedor');
      return;
    }

    // Clean items: remove rows where all columns are empty
    const cleanedItems = items.filter(item => {
      return Object.values(item).some(val => val !== undefined && val !== null && String(val).trim() !== '');
    });

    if (cleanedItems.length === 0) {
      toast.error('La orden debe contener al menos un artículo');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        supplier_id: supplierId,
        order_id: orderId,
        user_id: user?.id || null,
        date: preserveTimeOrStartOfDay(orderDate),
        status: status ? status.toLowerCase() : 'pendiente',
        notes: notes || null,
        items: cleanedItems,
        total: total
      };

      const newOrder = await SuppliersApiService.createOrder(payload);
      onOrderCreated(newOrder);
      handleClose();
    } catch (err: any) {
      console.error('Error creating supplier order:', err);
      toast.error(err.message || 'Error al guardar la orden de proveedor');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSupplierId(0);
    setOrderId(null);
    setOrderDate(todayDateInputMX());
    setStatus('pendiente');
    setNotes('');
    setTotal(0);
    setItems([{}]);
    setPreviousItems([]);
    setActiveCell(null);
    onClose();
  };

  if (!isOpen) return null;

  const filteredSuggestions = getFilteredSuggestions();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Plus className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nueva Orden de Proveedor</h2>
              <p className="text-sm text-gray-500">Crea un pedido con formato personalizado para tu proveedor</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
          {/* Form Fields Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            {/* Supplier Selector */}
            <div className="md:col-span-2">
              <Label htmlFor="supplier" className="text-sm font-medium text-gray-700">
                Proveedor *
              </Label>
              <select
                id="supplier"
                value={supplierId}
                onChange={(e) => setSupplierId(Number(e.target.value))}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              >
                <option value={0}>Selecciona un proveedor...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Client Order Linkage */}
            <div>
              <Label htmlFor="clientOrder" className="text-sm font-medium text-gray-700">
                Vincular Pedido Cliente
              </Label>
              <select
                id="clientOrder"
                value={orderId || ''}
                onChange={(e) => setOrderId(e.target.value ? Number(e.target.value) : null)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Ninguno (Opcional)</option>
                {clientOrders.map(o => (
                  <option key={o.id} value={o.id}>
                    #{o.id} - {o.client_name || 'Sin Nombre'} ({formatDateMX(o.date, 'DD/MM/YYYY')})
                  </option>
                ))}
              </select>
            </div>

            {/* Order Date */}
            <div>
              <Label htmlFor="orderDate" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <Calendar size={14} className="text-gray-400" /> Fecha de Pedido *
              </Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
            {/* Status */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <CheckCircle size={14} className="text-gray-400" /> Estado
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="pendiente">Pendiente</option>
                <option value="pagado">Pagado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>

            {/* Total */}
            <div>
              <Label htmlFor="total" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <span className="text-gray-400 font-bold">$</span> Total Orden
              </Label>
              <Input
                id="total"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={total === 0 ? '' : total}
                onChange={(e) => setTotal(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700 flex items-center gap-1">
                <FileText size={14} className="text-gray-400" /> Notas / Observaciones
              </Label>
              <Input
                id="notes"
                type="text"
                placeholder="Ej. Entregar antes del viernes, color específico..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Dynamic Table Section */}
          <div className="flex-1 flex flex-col min-h-[250px]">
            <div className="flex justify-between items-center mb-3">
              <Label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                Artículos del Pedido
                {selectedSupplier && !selectedSupplier.columns && (
                  <span className="inline-flex items-center gap-1 text-xs font-normal text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    <HelpCircle size={12} /> Proveedor sin formato. Columnas por defecto.
                  </span>
                )}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddRow}
                disabled={supplierId === 0}
                className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 border-dashed border-blue-300 hover:bg-blue-50"
              >
                <Plus size={14} /> Agregar Fila
              </Button>
            </div>

            {supplierId === 0 ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-gray-400 text-sm py-10">
                Selecciona un proveedor para cargar su formato de tabla de pedidos
              </div>
            ) : (
              <div className="flex-1 overflow-auto border border-gray-200 rounded-lg max-h-[300px]">
                <table className="min-w-full divide-y divide-gray-200 mb-32">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider"
                        >
                          {col}
                        </th>
                      ))}
                      <th
                        scope="col"
                        className="px-4 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider w-16"
                      >
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {items.map((item, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-slate-50/50">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 text-sm relative">
                            <div className="relative">
                              <Input
                                type="text"
                                value={item[col] || ''}
                                onChange={(e) => handleCellChange(rowIndex, col, e.target.value)}
                                onFocus={() => handleCellFocus(rowIndex, col, item[col] || '')}
                                onBlur={() => {
                                  // Delay hiding active cell to allow clicking on suggestion
                                  setTimeout(() => {
                                    setActiveCell(prev =>
                                      prev && prev.rowIndex === rowIndex && prev.colKey === col
                                        ? null
                                        : prev
                                    );
                                  }, 250);
                                }}
                                className="h-8 py-1 px-2 focus:ring-blue-500 focus:border-blue-500 text-xs"
                                placeholder={`Escribe ${col}...`}
                              />

                              {activeCell &&
                                activeCell.rowIndex === rowIndex &&
                                activeCell.colKey === col &&
                                filteredSuggestions.length > 0 && (
                                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-xl divide-y divide-gray-100">
                                    <div className="bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-600 sticky top-0 z-10">
                                      Sugerencias Históricas
                                    </div>
                                    {filteredSuggestions.map((suggestionValue, sIdx) => (
                                      <button
                                        key={sIdx}
                                        type="button"
                                        onMouseDown={() => handleSelectSuggestion(rowIndex, col, suggestionValue)}
                                        className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 text-gray-700 transition-colors font-medium"
                                      >
                                        {suggestionValue}
                                      </button>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </td>
                        ))}
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => handleRemoveRow(rowIndex)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-700 hover:bg-gray-50 border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || supplierId === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Guardando...
                </>
              ) : (
                'Crear Pedido'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSupplierOrderModal;
