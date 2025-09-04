import React, { useState, useEffect } from 'react';
import { type CreateOrderForm, createOrderSchema, type Order } from "../types";
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OrdersApiService } from '../OrdersApiService';
import { Button, Input, Label } from '@/components/ui';
import { Calendar, ReceiptText, X, DollarSign, Loader, CalendarDays, Plus, Trash2, Package, Search } from 'lucide-react';
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

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  currentUserId: number; // ID del usuario actual logueado
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
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [productSearchTerms, setProductSearchTerms] = useState<{[key: number]: string}>({});
  const [prefilledProductName, setPrefilledProductName] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    control
  } = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      user_id: currentUserId,
      date: new Date().toISOString().split('T')[0],
      status: 'pendiente',
      total: 0,
      products: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "products"
  });

  const watchedProducts = watch("products");

  // Calcular total automáticamente
  const calculateTotal = () => {
    if (!watchedProducts) return 0;
    return watchedProducts.reduce((total, product) => {
      return total + ((product?.quantity || 0) * (product?.unit_price || 0));
    }, 0);
  };

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Verificar cada dropdown individualmente
      fields.forEach((_, index) => {
        const dropdown = document.getElementById(`product-dropdown-${index}`);
        const inputContainer = dropdown?.parentElement;
        
        if (dropdown && dropdown.style.display === 'block') {
          const isClickInsideContainer = inputContainer?.contains(target);
          
          if (!isClickInsideContainer) {
            dropdown.style.display = 'none';
          }
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [fields]);

  // Actualizar total cuando cambien los productos
  useEffect(() => {
    const total = calculateTotal();
    setValue('total', total);
  }, [watchedProducts, setValue]);

  // Cargar clientes y productos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadClients();
      loadProducts();
    }
  }, [isOpen]);

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
      setProducts(response.filter(p => p.active === 1)); // Solo productos activos
    } catch (err) {
      console.error('Error loading products:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoadingProducts(false);
    }
  };

  const addProduct = () => {
    append({
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      height: undefined,
      width: undefined,
      position: '',
      colors: '',
      description: ''
    });
  };

  // Filtrar productos basado en el término de búsqueda para un índice específico
  const getFilteredProducts = (index: number) => {
    const searchTerm = productSearchTerms[index] || '';
    if (!searchTerm) return products;
    
    return products.filter(product => 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.serial_number && product.serial_number.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  };

  // Actualizar término de búsqueda para un producto específico
  const updateProductSearchTerm = (index: number, term: string) => {
    setProductSearchTerms(prev => ({
      ...prev,
      [index]: term
    }));
  };

  // Manejar la creación de un nuevo producto
  const handleProductCreated = (newProduct: Product) => {
    setProducts(prev => [...prev, newProduct]);
    // También podemos seleccionar automáticamente el producto recién creado
    // en el último campo de producto agregado si está vacío
    if (fields.length > 0) {
      const lastIndex = fields.length - 1;
      const lastProductId = watchedProducts?.[lastIndex]?.product_id;
      if (!lastProductId || lastProductId === 0) {
        setValue(`products.${lastIndex}.product_id` as const, newProduct.id);
        setValue(`products.${lastIndex}.unit_price` as const, newProduct.price);
      }
    }
    setPrefilledProductName(''); // Limpiar el nombre prellenado
  };

  // Función para abrir el modal de crear producto con nombre prellenado
  const openCreateProductModal = (productName?: string) => {
    if (productName) {
      setPrefilledProductName(productName);
    }
    setShowCreateProductModal(true);
  };

  const onSubmit = async (data: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Formatear las fechas y datos
      const orderData = {
        ...data,
        date: data.date,
        estimated_delivery_date: data.estimated_delivery_date || undefined,
        total: data.total || 0
      };

      const newOrder = await OrdersApiService.create(orderData);
      onOrderCreated(newOrder);
      reset();
      onClose();
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
    setError(null);
    onClose();
  };

  if(!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <ReceiptText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Nueva Orden</h2>
              <p className="text-sm text-gray-500">Agregar una nueva orden al sistema</p>
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
                  defaultValue="pending"
                >
                  <option value="pending">Pendiente</option>
                  <option value="in_progress">En progreso</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
              {errors.status && (
                <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
              )}
            </div>

            {/* Total */}
            <div>
              <Label htmlFor="total" className="text-sm font-medium text-gray-700">
                Total (calculado automáticamente)
              </Label>
              <div className="mt-1 relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  id="total"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="pl-10 bg-gray-50"
                  {...register('total', { valueAsNumber: true })}
                  readOnly
                />
              </div>
              {errors.total && (
                <p className="mt-1 text-sm text-red-600">{errors.total.message}</p>
              )}
            </div>
          </div>

          {/* Sección de Productos */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Productos</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => openCreateProductModal()}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Plus size={16} />
                  Crear Producto
                </Button>
                <Button
                  type="button"
                  onClick={addProduct}
                  className="flex items-center gap-2"
                  size="sm"
                  disabled={loadingProducts}
                >
                  <Plus size={16} />
                  Agregar a Orden
                </Button>
              </div>
            </div>

            {loadingProducts ? (
              <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                <Loader className="animate-spin" size={24} />
                <span className="ml-2 text-gray-500">Cargando productos...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {fields.length === 0 ? (
                  <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>No hay productos agregados</p>
                    <p className="text-sm">Haz clic en "Agregar Producto" para comenzar</p>
                  </div>
                ) : (
                  fields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg bg-gray-50">
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-medium text-gray-700">Producto #{index + 1}</h4>
                        <Button
                          type="button"
                          onClick={() => {
                            remove(index);
                            // Limpiar el término de búsqueda para este índice
                            setProductSearchTerms(prev => {
                              const newTerms = { ...prev };
                              delete newTerms[index];
                              return newTerms;
                            });
                          }}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Producto con autocompletado integrado */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Producto *</Label>
                          
                          <div className="mt-1 relative">
                            {/* Input de búsqueda/autocompletado */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10" size={16} />
                              <Input
                                type="text"
                                placeholder="Buscar o seleccionar producto..."
                                value={productSearchTerms[index] || ''}
                                onChange={(e) => {
                                  const searchTerm = e.target.value;
                                  updateProductSearchTerm(index, searchTerm);
                                  
                                  // Si el usuario está escribiendo, limpiar la selección
                                  if (searchTerm !== '') {
                                    setValue(`products.${index}.product_id` as const, 0);
                                  }
                                  
                                  // Mostrar dropdown si hay texto o al hacer foco
                                  const dropdown = document.getElementById(`product-dropdown-${index}`);
                                  if (dropdown) {
                                    dropdown.style.display = searchTerm || getFilteredProducts(index).length > 0 ? 'block' : 'none';
                                  }
                                }}
                                onFocus={() => {
                                  // Mostrar dropdown al hacer foco
                                  const dropdown = document.getElementById(`product-dropdown-${index}`);
                                  if (dropdown) dropdown.style.display = 'block';
                                }}
                                className="pl-10 pr-4"
                              />
                            </div>
                            
                            {/* Dropdown de productos */}
                            <div 
                              id={`product-dropdown-${index}`}
                              className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto hidden"
                              onMouseLeave={() => {
                                // Ocultar dropdown al salir con el mouse
                                setTimeout(() => {
                                  const dropdown = document.getElementById(`product-dropdown-${index}`);
                                  if (dropdown && !dropdown.matches(':hover')) {
                                    dropdown.style.display = 'none';
                                  }
                                }, 100);
                              }}
                            >
                              {getFilteredProducts(index).length > 0 ? (
                                getFilteredProducts(index).map((product) => (
                                  <div
                                    key={product.id}
                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    onClick={() => {
                                      // Seleccionar producto
                                      setValue(`products.${index}.product_id` as const, product.id);
                                      setValue(`products.${index}.unit_price` as const, product.price);
                                      updateProductSearchTerm(index, `${product.name}${product.serial_number ? ` (${product.serial_number})` : ''}`);
                                      
                                      // Ocultar dropdown
                                      const dropdown = document.getElementById(`product-dropdown-${index}`);
                                      if (dropdown) dropdown.style.display = 'none';
                                    }}
                                  >
                                    <div className="flex justify-between items-center">
                                      <div>
                                        <div className="font-medium text-sm text-gray-900">
                                          {product.name}
                                        </div>
                                        {product.serial_number && (
                                          <div className="text-xs text-gray-500">
                                            {product.serial_number}
                                          </div>
                                        )}
                                      </div>
                                      <div className="text-sm font-semibold text-green-600">
                                        ${product.price}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="px-3 py-4 text-center">
                                  <p className="text-sm text-gray-500 mb-2">No se encontraron productos</p>
                                  {productSearchTerms[index] && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        openCreateProductModal(productSearchTerms[index]);
                                        // Ocultar dropdown
                                        const dropdown = document.getElementById(`product-dropdown-${index}`);
                                        if (dropdown) dropdown.style.display = 'none';
                                      }}
                                      className="text-xs"
                                    >
                                      <Plus size={12} className="mr-1" />
                                      Crear "{productSearchTerms[index]}"
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Input hidden para el formulario */}
                          <input
                            type="hidden"
                            {...register(`products.${index}.product_id` as const, { valueAsNumber: true })}
                          />

                          {errors.products?.[index]?.product_id && (
                            <p className="mt-1 text-sm text-red-600">{errors.products[index]?.product_id?.message}</p>
                          )}
                        </div>

                        {/* Cantidad */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Cantidad *</Label>
                          <Input
                            type="number"
                            min="1"
                            className="mt-1"
                            {...register(`products.${index}.quantity` as const, { valueAsNumber: true })}
                          />
                          {errors.products?.[index]?.quantity && (
                            <p className="mt-1 text-sm text-red-600">{errors.products[index]?.quantity?.message}</p>
                          )}
                        </div>

                        {/* Precio */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Precio *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1"
                            {...register(`products.${index}.unit_price` as const, { valueAsNumber: true })}
                          />
                          {errors.products?.[index]?.unit_price && (
                            <p className="mt-1 text-sm text-red-600">{errors.products[index]?.unit_price?.message}</p>
                          )}
                        </div>

                        {/* Alto */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Alto (cm)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1"
                            {...register(`products.${index}.height` as const, { valueAsNumber: true })}
                          />
                        </div>

                        {/* Ancho */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Ancho (cm)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            className="mt-1"
                            {...register(`products.${index}.width` as const, { valueAsNumber: true })}
                          />
                        </div>

                        {/* Posición */}
                        <div>
                          <Label className="text-sm font-medium text-gray-700">Posición</Label>
                          <Input
                            type="text"
                            className="mt-1"
                            placeholder="Ej: Esquina superior izquierda"
                            {...register(`products.${index}.position` as const)}
                          />
                        </div>

                        {/* Colores */}
                        <div className="md:col-span-2">
                          <Label className="text-sm font-medium text-gray-700">Colores</Label>
                          <Input
                            type="text"
                            className="mt-1"
                            placeholder="Ej: Rojo, Azul, Verde"
                            {...register(`products.${index}.colors` as const)}
                          />
                        </div>

                        {/* Descripción */}
                        <div className="md:col-span-3">
                          <Label className="text-sm font-medium text-gray-700">Descripción</Label>
                          <textarea
                            className="mt-1 w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                            rows={2}
                            placeholder="Detalles adicionales del producto"
                            {...register(`products.${index}.description` as const)}
                          />
                        </div>
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
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting && <Loader className="animate-spin" size={16} />}
              {isSubmitting ? 'Creando...' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </div>
      
      {/* Modal de crear producto */}
      <QuickCreateProductModal
        isOpen={showCreateProductModal}
        onClose={() => {
          setShowCreateProductModal(false);
          setPrefilledProductName('');
        }}
        onProductCreated={handleProductCreated}
        prefilledName={prefilledProductName}
      />
    </div>
  );
};

export default CreateOrderModal;