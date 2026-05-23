import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import { Layers, Package, Search } from 'lucide-react';
import type { Product } from '@/features/products/types';
import type { ProductTemplate } from '@/features/productTemplates/types';
import type { FilteredItem, DropdownPosition } from '../hooks/useOrderItems';

interface ItemSearchDropdownProps {
  index: number;
  filteredItems: FilteredItem[];
  dropdownPosition: DropdownPosition;
  selectedCategory: 'all' | 'products' | 'templates';
  searchTerm: string;
  onSelectItem: (index: number, type: 'product' | 'template', item: Product | ProductTemplate) => void;
  onClearSearch: (index: number) => void;
}

const ItemSearchDropdown: React.FC<ItemSearchDropdownProps> = ({
  index,
  filteredItems,
  dropdownPosition,
  selectedCategory,
  searchTerm,
  onSelectItem,
  onClearSearch,
}) => {
  return createPortal(
    <div
      id={`item-dropdown-${index}`}
      className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-lg overflow-y-auto"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: `${dropdownPosition.maxHeight || 200}px`
      }}
    >
      {filteredItems.length > 0 ? (
        filteredItems.map((filteredItem) => (
          <div
            key={`${filteredItem.type}-${filteredItem.item.id}`}
            className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 group"
          >
            <div className="flex justify-between items-center">
              <div
                className="flex-1 flex items-start gap-2"
                onClick={() => onSelectItem(index, filteredItem.type, filteredItem.item)}
              >
                <div className="flex items-center gap-2 flex-1">
                  {filteredItem.type === 'product' ? (
                    <Package className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Layers className="h-4 w-4 text-purple-500" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-sm text-gray-900">
                      {filteredItem.type === 'product'
                        ? (filteredItem.item as Product).name
                        : (filteredItem.item as any).name
                      }
                    </div>
                    {filteredItem.type === 'product' && (filteredItem.item as Product).serial_number && (
                      <div className="text-xs text-gray-500">
                        SN: {(filteredItem.item as Product).serial_number}
                      </div>
                    )}
                    {filteredItem.type === 'template' && (
                      <div className="text-xs text-gray-500">
                        {(filteredItem.item as ProductTemplate).description && (
                          <span>{(filteredItem.item as ProductTemplate).description}</span>
                        )}
                        {(filteredItem.item as ProductTemplate).width && (filteredItem.item as ProductTemplate).height && (
                          <span className="ml-2">{(filteredItem.item as ProductTemplate).width}x{(filteredItem.item as ProductTemplate).height}cm</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-green-600">
                  ${filteredItem.type === 'product'
                    ? (filteredItem.item as Product).price.toFixed(2)
                    : (filteredItem.item as ProductTemplate).final_price.toFixed(2)
                  }
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="px-3 py-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="text-gray-400">
              {selectedCategory === 'products' ? (
                <Package className="h-8 w-8" />
              ) : selectedCategory === 'templates' ? (
                <Layers className="h-8 w-8" />
              ) : (
                <Search className="h-8 w-8" />
              )}
            </div>
            <p className="text-sm text-gray-500 mb-2">No se encontraron items</p>
            {searchTerm && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onClearSearch(index)}
                className="text-xs"
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default ItemSearchDropdown;
