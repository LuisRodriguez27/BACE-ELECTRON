import { useState, useEffect, useCallback } from 'react';

import type { Product } from '@/features/products/types';
import type { ProductTemplate } from '@/features/productTemplates/types';
import { ProductTemplatesApiService } from '@/features/productTemplates/ProductTemplatesApiService';
import type { OrderFormItem } from '../../../types';

export interface FilteredItem {
  type: 'product' | 'template';
  item: Product | ProductTemplate;
}

export interface DropdownPosition {
  top: number;
  left: number;
  width: number;
  maxHeight?: number;
}

export interface UseOrderItemsReturn {
  // Data
  products: Product[];
  templates: ProductTemplate[];
  orderItems: OrderFormItem[];
  loadingProducts: boolean;
  loadingTemplates: boolean;

  // Search & dropdown state
  searchTerms: { [key: number]: string };
  showDropdowns: { [key: number]: boolean };
  dropdownPositions: { [key: number]: DropdownPosition };
  selectedCategory: { [key: number]: 'all' | 'products' | 'templates' };

  // Actions
  loadProducts: () => Promise<void>;
  loadTemplates: () => Promise<void>;
  addOrderItem: () => void;
  removeOrderItem: (index: number) => void;
  updateOrderItem: (index: number, updates: Partial<OrderFormItem>) => void;
  setOrderItems: React.Dispatch<React.SetStateAction<OrderFormItem[]>>;
  setSearchTerms: React.Dispatch<React.SetStateAction<{ [key: number]: string }>>;
  setSelectedCategory: React.Dispatch<React.SetStateAction<{ [key: number]: 'all' | 'products' | 'templates' }>>;
  getFilteredItems: (index: number) => FilteredItem[];
  selectItem: (index: number, type: 'product' | 'template', item: Product | ProductTemplate) => void;
  showDropdown: (index: number) => void;
  setShowDropdowns: React.Dispatch<React.SetStateAction<{ [key: number]: boolean }>>;
  reset: () => void;
}

export const useOrderItems = (): UseOrderItemsReturn => {
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([]);
  const [searchTerms, setSearchTerms] = useState<{ [key: number]: string }>({});
  const [showDropdowns, setShowDropdowns] = useState<{ [key: number]: boolean }>({});
  const [dropdownPositions, setDropdownPositions] = useState<{ [key: number]: DropdownPosition }>({});
  const [selectedCategory, setSelectedCategory] = useState<{ [key: number]: 'all' | 'products' | 'templates' }>({});
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);

  // Función para calcular posición del dropdown
  const updateDropdownPosition = useCallback((index: number) => {
    const inputElement = document.getElementById(`item-input-${index}`);
    if (inputElement) {
      const rect = inputElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Ajustar posición horizontal para no salirse de la pantalla
      let left = rect.left + window.scrollX;
      if (rect.right > viewportWidth - 20) {
        left = viewportWidth - rect.width - 20 + window.scrollX;
      }

      // Calcular altura máxima disponible hacia abajo
      const spaceBelow = viewportHeight - rect.bottom - 20;
      const maxHeight = Math.max(150, Math.min(300, spaceBelow));

      setDropdownPositions(prev => ({
        ...prev,
        [index]: {
          top: rect.bottom + window.scrollY,
          left: left,
          width: rect.width,
          maxHeight: maxHeight
        }
      }));
    }
  }, []);

  // Función mejorada para mostrar dropdown
  const showDropdownFn = useCallback((index: number) => {
    setActiveRowIndex(index);
    updateDropdownPosition(index);
    setShowDropdowns(prev => ({ ...prev, [index]: true }));
  }, [updateDropdownPosition]);

  // Recalcular posiciones cuando cambie el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      Object.keys(showDropdowns).forEach(key => {
        if (showDropdowns[parseInt(key)]) {
          updateDropdownPosition(parseInt(key));
        }
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleResize);
    };
  }, [showDropdowns, updateDropdownPosition]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      orderItems.forEach((_, index) => {
        const dropdown = document.getElementById(`item-dropdown-${index}`);
        const inputElement = document.getElementById(`item-input-${index}`);

        if (dropdown && showDropdowns[index]) {
          const isClickInsideDropdown = dropdown.contains(target);
          const isClickInsideInput = inputElement?.contains(target);

          if (!isClickInsideDropdown && !isClickInsideInput) {
            setShowDropdowns(prev => ({ ...prev, [index]: false }));
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [orderItems, showDropdowns]);

  // Búsqueda dinámica con debounce de productos para la fila activa
  useEffect(() => {
    if (activeRowIndex === null) return;
    if (!showDropdowns[activeRowIndex]) return;

    const searchTerm = searchTerms[activeRowIndex] || '';

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await window.api.getProductsPaginated(1, 50, searchTerm);
        setProducts(response.data.filter(p => p.active === true));
      } catch (err) {
        console.error('Error searching products in orders hook:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    if (searchTerm === '') {
      fetchProducts();
      return;
    }

    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [
    activeRowIndex,
    activeRowIndex !== null ? showDropdowns[activeRowIndex] : false,
    activeRowIndex !== null ? searchTerms[activeRowIndex] : undefined
  ]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await window.api.getProductsPaginated(1, 50, '');
      setProducts(response.data.filter(p => p.active === true));
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await ProductTemplatesApiService.findAll();
      setTemplates(response.filter((t: ProductTemplate) => t.active === true));
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  const addOrderItem = useCallback(() => {
    const newItem: OrderFormItem = {
      type: 'product',
      id: 0,
      name: '',
      quantity: 1,
      unit_price: 0
    };
    const newIndex = orderItems.length;
    setOrderItems(prev => [...prev, newItem]);
    setSelectedCategory(prev => ({ ...prev, [newIndex]: 'all' }));
  }, [orderItems.length]);

  const removeOrderItem = useCallback((index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
    setActiveRowIndex(prev => prev === index ? null : prev);
    setSearchTerms(prev => {
      const newTerms = { ...prev };
      delete newTerms[index];
      return newTerms;
    });
    setShowDropdowns(prev => {
      const newDropdowns = { ...prev };
      delete newDropdowns[index];
      return newDropdowns;
    });
    setDropdownPositions(prev => {
      const newPositions = { ...prev };
      delete newPositions[index];
      return newPositions;
    });
  }, []);

  const updateOrderItem = useCallback((index: number, updates: Partial<OrderFormItem>) => {
    setOrderItems(prev => prev.map((item, i) =>
      i === index ? { ...item, ...updates } : item
    ));
  }, []);

  // Obtener items filtrados (productos + plantillas) para búsqueda
  const getFilteredItems = useCallback((index: number): FilteredItem[] => {
    const searchTerm = searchTerms[index] || '';
    const category = selectedCategory[index] || 'all';
    const items: FilteredItem[] = [];

    // Agregar productos si corresponde
    if (category === 'all' || category === 'products') {
      products.forEach(product => {
        // Ya vienen filtrados de la BD para la fila activa, así que los agregamos directamente
        items.push({
          type: 'product',
          item: product,
        });
      });
    }

    // Agregar plantillas si corresponde
    if (category === 'all' || category === 'templates') {
      templates.forEach(template => {
        const baseProductName = template.product_name || 'Producto';
        const templateName = `${baseProductName} (Plantilla)`;

        const matchesSearch = !searchTerm ||
          templateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (template.colors && template.colors.toLowerCase().includes(searchTerm.toLowerCase()));

        if (matchesSearch) {
          items.push({
            type: 'template',
            item: { ...template, name: templateName, product_name: baseProductName } as any
          });
        }
      });
    }

    // Ordenar por nombre
    return items.sort((a, b) => {
      const nameA = a.type === 'product' ? (a.item as Product).name : (a.item as any).name;
      const nameB = b.type === 'product' ? (b.item as Product).name : (b.item as any).name;
      return nameA.localeCompare(nameB);
    });
  }, [searchTerms, selectedCategory, products, templates]);

  // Seleccionar item (producto o plantilla)
  const selectItem = useCallback((index: number, type: 'product' | 'template', item: Product | ProductTemplate) => {
    if (type === 'product') {
      const product = item as Product;
      updateOrderItem(index, {
        type: 'product',
        id: product.id,
        name: product.name,
        unit_price: product.price,
        description: product.description,
        serial_number: product.serial_number
      });
      setSearchTerms(prev => ({ ...prev, [index]: `${product.name}${product.serial_number ? ` (${product.serial_number})` : ''}` }));
    } else {
      const template = item as ProductTemplate;
      const baseProductName = template.product_name || 'Producto';
      const templateName = `${baseProductName} (Plantilla)`;

      updateOrderItem(index, {
        type: 'template',
        id: template.id,
        name: templateName,
        unit_price: template.final_price,
        description: template.description,
        width: template.width,
        height: template.height,
        colors: template.colors,
        position: template.position,
        texts: template.texts
      });
      setSearchTerms(prev => ({ ...prev, [index]: templateName }));
    }

    setShowDropdowns(prev => ({ ...prev, [index]: false }));
    setActiveRowIndex(null);
  }, [updateOrderItem]);

  const reset = useCallback(() => {
    setOrderItems([]);
    setSearchTerms({});
    setShowDropdowns({});
    setDropdownPositions({});
    setSelectedCategory({});
    setActiveRowIndex(null);
  }, []);

  return {
    products,
    templates,
    orderItems,
    loadingProducts,
    loadingTemplates,
    searchTerms,
    showDropdowns,
    dropdownPositions,
    selectedCategory,
    loadProducts,
    loadTemplates,
    addOrderItem,
    removeOrderItem,
    updateOrderItem,
    setOrderItems,
    setSearchTerms,
    setSelectedCategory,
    getFilteredItems,
    selectItem,
    showDropdown: showDropdownFn,
    setShowDropdowns,
    reset,
  };
};
