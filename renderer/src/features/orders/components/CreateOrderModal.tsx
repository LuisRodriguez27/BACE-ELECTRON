import React, { useState, useEffect } from 'react';
import { type CreateOrderForm, createOrderSchema, type Order, type OrderFormItem, createOrderItemFromFormItem, calculateOrderTotal } from "../types";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrdersApiService } from '../OrdersApiService';
import { Button, Input, Label } from '@/components/ui';
import { Calendar, ReceiptText, X, DollarSign, Loader, CalendarDays, Plus, Trash2, Package, Search, Layers } from 'lucide-react';
import type { Product } from '@/features/products/types';
import QuickCreateProductModal from '@/features/products/components/QuickCreateProductModal';
import { extractErrorMessage } from '@/utils/errorHandling';

interface Client {
  id: number;
  name: string;
  phone: string;
  address?: string;
  description?: string;
}

interface ProductTemplate {
  id: number;
  product_id: number;
  final_price: number;
  width?: number;
  height?: number;
  colors?: string;
  position?: string;
  texts?: string;
  description?: string;
  created_by?: number;
  active: number;
}

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  currentUserId: number;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  currentUserId
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  
  // Estado de los items de la orden (productos y plantillas)
  const [orderItems, setOrderItems] = useState<OrderFormItem[]>([]);
  const [searchTerms, setSearchTerms] = useState<{[key: number]: string}>({});
  const [showDropdowns, setShowDropdowns] = useState<{[key: number]: boolean}>({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      user_id: currentUserId,
      date: new Date().toISOString().split('T')[0],
      status: 'pendiente',
      items: []
    }
  });

  // Actualizar el formulario cuando cambien los items
  useEffect(() => {
    const items = orderItems.map(createOrderItemFromFormItem);
    setValue('items', items);
  }, [orderItems, setValue]);

  // Calcular total automáticamente
  const total = calculateOrderTotal(orderItems);

  // Cargar datos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadProducts();
      loadTemplates();
    }
  }, [isOpen]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      orderItems.forEach((_, index) => {
        const dropdown = document.getElementById(`item-dropdown-${index}`);
        const inputContainer = dropdown?.parentElement;
        
        if (dropdown && showDropdowns[index]) {
          const isClickInsideContainer = inputContainer?.contains(target);
          
          if (!isClickInsideContainer) {
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

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await window.api.getAllClients();
      setClients(response);
    } catch (err) {
      console.error('Error loading clients:', err);
      setError('Error al cargar los clientes');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      const response = await window.api.getAllProducts();
      setProducts(response.filter(p => p.active === 1));
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      // Asumiendo que tienes un API para obtener plantillas
      const response = await window.api.getAllTemplates();
      setTemplates(response.filter((t: ProductTemplate) => t.active === 1));
    } catch (err) {
      console.error('Error loading templates:', err);
      setError('Error al cargar las plantillas');
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Agregar nuevo item vacío
  const addOrderItem = () => {
    const newItem: OrderFormItem = {
      type: 'product',
      id: 0,
      name: '',
      quantity: 1,
      unit_price: 0
    };
    setOrderItems(prev => [...prev, newItem]);
  };

  // Remover item
  const removeOrderItem = (index: number) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index));
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
  };

  // Actualizar item específico
  const updateOrderItem = (index: number, updates: Partial<OrderFormItem>) => {
    setOrderItems(prev => prev.map((item, i) => 
      i === index ? { ...item, ...updates } : item
    ));
  };

  // Obtener items filtrados (productos + plantillas) para búsqueda
  const getFilteredItems = (index: number) => {
    const searchTerm = searchTerms[index] || '';
    const items: Array<{type: 'product' | 'template', item: Product | ProductTemplate}> = [];
    
    // Agregar productos
    products.forEach(product => {
      if (!searchTerm || 
          product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (product.serial_number && product.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))) {
        items.push({ type: 'product', item: product });
      }
    });

    // Agregar plantillas
    templates.forEach(template => {
      // Buscar el producto base de la plantilla
      const baseProduct = products.find(p => p.id === template.product_id);
      const templateName = baseProduct ? `${baseProduct.name} (Plantilla)` : `Plantilla #${template.id}`;
      
      if (!searchTerm || templateName.toLowerCase().includes(searchTerm.toLowerCase())) {
        items.push({ type: 'template', item: { ...template, name: templateName } as any });
      }
    });

    return items;
  };

  // Seleccionar item (producto o plantilla)
  const selectItem = (index: number, type: 'product' | 'template', item: Product | ProductTemplate) => {
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
      const baseProduct = products.find(p => p.id === template.product_id);
      const templateName = baseProduct ? `${baseProduct.name} (Plantilla)` : `Plantilla #${template.id}`;
      
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
  };

  const onSubmit = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validar que hay items
      if (orderItems.length === 0) {
        setError('Debe agregar al menos un producto o plantilla');
        return;
      }

      // Validar que todos los items tienen selección válida
      const invalidItems = orderItems.filter(item => !item.id || item.id === 0);
      if (invalidItems.length > 0) {
        setError('Todos los productos/plantillas deben estar seleccionados');
        return;
      }

      // Convertir orderItems a formato del backend
      const items = orderItems.map(createOrderItemFromFormItem);
      
      // Debug: Mostrar el estado actual antes de enviar
      console.log('orderItems estado:', orderItems);
      console.log('Items convertidos:', items);
      
      // Validar que los items convertidos son válidos
      if (items.length === 0) {
        setError('Error: Los items no se convertieron correctamente');
        return;
      }

      // Verificar que cada item tiene la estructura correcta
      for (const item of items) {
        if (!item.product_id && !item.template_id) {
          console.error('Item inválido:', item);
          setError('Error: Item sin product_id ni template_id');
          return;
        }
      }

      // Crear datos de la orden con los items del estado local
      const orderData: CreateOrderForm = {
        client_id: formData.client_id,
        user_id: currentUserId,
        date: formData.date,
        estimated_delivery_date: formData.estimated_delivery_date || undefined,
        status: formData.status || 'pendiente',
        notes: formData.notes || undefined,
        items // Usar los items del estado local, no del formulario
      };

      console.log('Datos a enviar:', orderData); // Para debugging
      console.log('Items:', items); // Para debugging

      const newOrder = await OrdersApiService.create(orderData);
      onOrderCreated(newOrder);
      handleClose();
    } catch (err: any) {
      console.error('Error creating order', err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setOrderItems([]);
    setSearchTerms({});
    setShowDropdowns({});
    setError(null);
    onClose();
  };

  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nueva Orden</h2>
              <p className="text-sm text-gray-500">Crear orden con productos y/o plantillas</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Cliente */}
            <div className="md:col-span-2">
              <Label htmlFor="client_id" className="text-sm font-medium text-gray-700">
                Cliente *
              </Label>
              <div className="mt-1">
                {loadingClients ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg">
                    <Loader className="animate-spin" size={16} />
                    <span className="text-sm text-gray-500">Cargando clientes...</span>
                  </div>
                ) : (
                  <select
                    {...register('client_id', { valueAsNumber: true })}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {errors.client_id && (
                <p className="mt-1 text-sm text-red-600">{errors.client_id.message}</p>
              )}
            </div>

            {/* Fecha de la orden */}
            <div>
              <Label htmlFor="date" className="text-sm font-medium text-gray-700">
                Fecha de la orden *
              </Label>
              <div className="mt-1 relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="date"
                  type="date"
                  className="pl-10"
                  {...register('date')}
                />
              </div>
              {errors.date && (
                <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>

            {/* Fecha estimada de entrega */}
            <div>
              <Label htmlFor="estimated_delivery_date" className="text-sm font-medium text-gray-700">
                Fecha estimada de entrega
              </Label>
              <div className="mt-1 relative">
                <CalendarDays className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="estimated_delivery_date"
                  type="date"
                  className="pl-10"
                  {...register('estimated_delivery_date')}
                />
              </div>
              {errors.estimated_delivery_date && (
                <p className="mt-1 text-sm text-red-600">{errors.estimated_delivery_date.message}</p>
              )}
            </div>

            {/* Estado */}
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-700">
                Estado
              </Label>
              <div className="mt-1">
                <select
                  {...register('status')}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en proceso">En Proceso</option>
                  <option value="completado">Completado</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {/* Total (solo lectura) */}
            <div>
              <Label htmlFor="total" className="text-sm font-medium text-gray-700">
                Total (calculado automáticamente)
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="total"
                  type="text"
                  value={`$${total.toFixed(2)}`}
                  className="pl-10 bg-gray-50"
                  readOnly
                />
              </div>
            </div>

            {/* Notas */}
            <div className="md:col-span-2">
              <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                Notas
              </Label>
              <textarea
                {...register('notes')}
                className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Notas adicionales sobre la orden..."
              />
            </div>
          </div>

          {/* Sección de Items (Productos y Plantillas) */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Productos y Plantillas</h3>
                <span className="text-sm text-gray-500">({orderItems.length} items)</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => setShowCreateProductModal(true)}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Crear Producto
                </Button>
                <Button
                  type="button"
                  onClick={addOrderItem}
                  className="flex items-center gap-2"
                  size="sm"
                  disabled={loadingProducts || loadingTemplates}
                >
                  <Plus size={16} />
                  Agregar Item
                </Button>
              </div>
            </div>

            {(loadingProducts || loadingTemplates) ? (
              <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                <Loader className="animate-spin" size={24} />
                <span className="ml-2 text-gray-500">Cargando productos y plantillas...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <Package className="h-12 w-12 text-gray-300" />
                      <Layers className="h-12 w-12 text-gray-300" />
                    </div>
                    <p>No hay productos o plantillas agregados</p>
                    <p className="text-sm">Haz clic en "Agregar Item" para comenzar</p>
                  </div>
                ) : (
                  orderItems.map((item, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-gray-50">
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
                        </div>
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
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Selector de Producto/Plantilla */}
                        <div className="lg:col-span-2">
                          <Label className="text-sm font-medium text-gray-700">
                            Producto o Plantilla *
                          </Label>
                          
                          <div className="mt-1 relative">
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                              <Input
                                type="text"
                                placeholder="Buscar producto o plantilla..."
                                value={searchTerms[index] || ''}
                                onChange={(e) => {
                                  const searchTerm = e.target.value;
                                  setSearchTerms(prev => ({ ...prev, [index]: searchTerm }));
                                  
                                  if (searchTerm !== item.name) {
                                    updateOrderItem(index, { id: 0, name: '', unit_price: 0 });
                                  }
                                  
                                  setShowDropdowns(prev => ({ ...prev, [index]: true }));
                                }}
                                onFocus={() => {
                                  setShowDropdowns(prev => ({ ...prev, [index]: true }));
                                }}
                                className="pl-10 pr-4"
                              />
                            </div>
                            
                            {/* Dropdown de productos y plantillas */}
                            {showDropdowns[index] && (
                              <div 
                                id={`item-dropdown-${index}`}
                                className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto"
                              >
                                {getFilteredItems(index).length > 0 ? (
                                  getFilteredItems(index).map((filteredItem, _) => (
                                    <div
                                      key={`${filteredItem.type}-${filteredItem.item.id}`}
                                      className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                      onClick={() => selectItem(index, filteredItem.type, filteredItem.item)}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            {filteredItem.type === 'product' ? (
                                              <Package className="h-4 w-4 text-blue-500" />
                                            ) : (
                                              <Layers className="h-4 w-4 text-purple-500" />
                                            )}
                                            <div className="font-medium text-sm text-gray-900">
                                              {filteredItem.type === 'product' 
                                                ? (filteredItem.item as Product).name
                                                : (filteredItem.item as any).name
                                              }
                                            </div>
                                          </div>
                                          {filteredItem.type === 'product' && (filteredItem.item as Product).serial_number && (
                                            <div className="text-xs text-gray-500 ml-6">
                                              {(filteredItem.item as Product).serial_number}
                                            </div>
                                          )}
                                        </div>
                                        <div className="text-sm font-semibold text-green-600">
                                          ${filteredItem.type === 'product' 
                                            ? (filteredItem.item as Product).price
                                            : (filteredItem.item as ProductTemplate).final_price
                                          }
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                ) : (
                                  <div className="px-3 py-4 text-center">
                                    <p className="text-sm text-gray-500 mb-2">No se encontraron items</p>
                                  </div>
                                )}
                              </div>
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
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateOrderItem(index, { quantity: parseInt(e.target.value) || 1 })}
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
                            value={item.unit_price}
                            onChange={(e) => updateOrderItem(index, { unit_price: parseFloat(e.target.value) || 0 })}
                            className="mt-1"
                          />
                        </div>

                        {/* Información adicional del item */}
                        {item.id > 0 && (
                          <div className="lg:col-span-4 pt-4 border-t border-gray-200">
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
                  ))
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || orderItems.length === 0}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="animate-spin" size={16} />}
              {isSubmitting ? 'Creando...' : `Crear Orden (${orderItems.length} items)`}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Modal de crear producto */}
      <QuickCreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => setShowCreateProductModal(false)}
        onProductCreated={handleProductCreated}
        prefilledName=""
      />
    </div>
  );
};

export default CreateOrderModal;