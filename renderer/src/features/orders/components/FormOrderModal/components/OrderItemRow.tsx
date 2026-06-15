import React, { useMemo } from 'react';
import { Button, Input, Label } from '@/components/ui';
import { Layers, Package, Search, ShoppingBag, Trash2 } from 'lucide-react';

import type { OrderFormItem } from '../../../types';
import type { UseOrderItemsReturn } from '../hooks/useOrderItems';
import ItemSearchDropdown from './ItemSearchDropdown';

interface OrderItemRowProps {
  index: number;
  item: OrderFormItem;
  orderItemsHook: UseOrderItemsReturn;
  onCreateTemplateFromProduct: (productId: number) => void;
}

const OrderItemRow: React.FC<OrderItemRowProps> = ({
  index,
  item,
  orderItemsHook,
  onCreateTemplateFromProduct,
}) => {
  const {
    products,
    templates,
    searchTerms,
    showDropdowns,
    dropdownPositions,
    selectedCategory,
    updateOrderItem,
    removeOrderItem,
    getFilteredItems,
    selectItem,
    showDropdown,
    setSearchTerms,
    setSelectedCategory,

  } = orderItemsHook;

  // Memoize filtered items to avoid double computation
  const filteredItems = useMemo(() => getFilteredItems(index), [getFilteredItems, index]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setSearchTerms(prev => ({ ...prev, [index]: searchTerm }));

    if (searchTerm !== item.name) {
      updateOrderItem(index, { id: 0, name: '', unit_price: 0 });
    }

    showDropdown(index);
  };

  const handleClearSearch = (idx: number) => {
    setSearchTerms(prev => ({ ...prev, [idx]: '' }));
    setSelectedCategory(prev => ({ ...prev, [idx]: 'all' }));
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-700">Item #{index + 1}</h4>
          <span className={`px-2 py-1 text-xs rounded ${
            item.type === 'product'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            {item.type === 'product' ? 'Producto' : 'Plantilla'}
          </span>
          {item.id > 0 && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
              ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.id > 0 && (
            <>
              {item.type === 'product' && (
                <Button
                  type="button"
                  onClick={() => onCreateTemplateFromProduct(item.id)}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 hover:text-purple-700"
                  title="Crear plantilla desde este producto"
                >
                  <Layers size={16} />
                </Button>
              )}
            </>
          )}
          <Button
            type="button"
            onClick={() => removeOrderItem(index)}
            variant="outline"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Selector de Producto/Plantilla */}
        <div className="lg:col-span-2">
          <Label className="text-sm font-medium text-gray-700">
            Producto o Plantilla *
          </Label>

          {/* Filtros de categoría */}
          <div className="mt-1 mb-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={selectedCategory[index] === 'all' || !selectedCategory[index] ? 'default' : 'outline'}
              onClick={() => {
                setSelectedCategory(prev => ({ ...prev, [index]: 'all' }));
                showDropdown(index);
              }}
              className="text-xs px-2 py-1 h-7"
            >
              <ShoppingBag size={12} className="mr-1" />
              Todos
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedCategory[index] === 'products' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedCategory(prev => ({ ...prev, [index]: 'products' }));
                showDropdown(index);
              }}
              className="text-xs px-2 py-1 h-7"
            >
              <Package size={12} className="mr-1" />
              Productos ({products.length})
            </Button>
            <Button
              type="button"
              size="sm"
              variant={selectedCategory[index] === 'templates' ? 'default' : 'outline'}
              onClick={() => {
                setSelectedCategory(prev => ({ ...prev, [index]: 'templates' }));
                showDropdown(index);
              }}
              className="text-xs px-2 py-1 h-7"
            >
              <Layers size={12} className="mr-1" />
              Plantillas ({templates.length})
            </Button>
          </div>

          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
              <Input
                id={`item-input-${index}`}
                type="text"
                placeholder={`Buscar ${selectedCategory[index] === 'products' ? 'productos' : selectedCategory[index] === 'templates' ? 'plantillas' : 'productos o plantillas'}...`}
                value={searchTerms[index] || ''}
                onChange={handleSearchChange}
                onFocus={() => showDropdown(index)}
                className="pl-10 pr-4"
              />
            </div>

            {/* Dropdown de productos y plantillas */}
            {showDropdowns[index] && dropdownPositions[index] && (
              <ItemSearchDropdown
                index={index}
                filteredItems={filteredItems}
                dropdownPosition={dropdownPositions[index]}
                selectedCategory={selectedCategory[index] || 'all'}
                searchTerm={searchTerms[index] || ''}
                onSelectItem={selectItem}
                onClearSearch={handleClearSearch}
              />
            )}
          </div>

          {!item.id && (
            <p className="mt-1 text-sm text-red-600">Seleccione un producto o plantilla</p>
          )}
        </div>

        {/* Cantidad */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Cantidad *</Label>
          <Input
            type="number"
            min="0.0001"
            step="0.0001"
            value={Number.isNaN(item.quantity) ? '' : item.quantity}
            onChange={(e) => {
              const val = e.target.value;
              updateOrderItem(index, { quantity: val === '' ? NaN : parseFloat(val) });
            }}
            className="mt-1"
          />
        </div>

        {/* Precio */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Precio *</Label>
          <Input
            type="number"
            step="0.01"
            min="0"
            value={Number.isNaN(item.unit_price) ? '' : item.unit_price}
            onChange={(e) => {
              const val = e.target.value;
              updateOrderItem(index, { unit_price: val === '' ? NaN : parseFloat(val) });
            }}
            className="mt-1"
          />
        </div>

        {/* Estado de Entrega y Pago */}
        <div className="flex flex-col gap-2 justify-center pt-5">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!item.is_delivered}
              onChange={(e) => updateOrderItem(index, { is_delivered: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-medium text-gray-700">Entregado</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={!!item.is_paid}
              onChange={(e) => updateOrderItem(index, { is_paid: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-medium text-gray-700">Liquidado</span>
          </label>
        </div>

        {/* Información adicional del item */}
        {item.id > 0 && (
          <div className="lg:col-span-5 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              {item.serial_number && (
                <div>
                  <span className="font-medium text-gray-600">Número de serie:</span>
                  <p className="text-gray-700">{item.serial_number}</p>
                </div>
              )}
              {item.width && item.height && (
                <div>
                  <span className="font-medium text-gray-600">Dimensiones:</span>
                  <p className="text-gray-700">{item.width} x {item.height} cm</p>
                </div>
              )}
              {item.colors && (
                <div>
                  <span className="font-medium text-gray-600">Colores:</span>
                  <p className="text-gray-700">{item.colors}</p>
                </div>
              )}
              {item.position && (
                <div>
                  <span className="font-medium text-gray-600">Posición:</span>
                  <p className="text-gray-700">{item.position}</p>
                </div>
              )}
              {item.description && (
                <div className="md:col-span-3">
                  <span className="font-medium text-gray-600">Descripción:</span>
                  <p className="text-gray-700">{item.description}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderItemRow;
