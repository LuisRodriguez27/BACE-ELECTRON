import { useState, useCallback } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { toast } from 'sonner';
import { OrdersApiService } from '../../../OrdersApiService';
import {
  type CreateOrderForm,
  createOrderItemFromFormItem,
  type Order,
  type OrderFormItem,
  getOrderItemType
} from '../../../types';
import type { UseClientSearchReturn } from '@/features/clients/hooks/useClientSearch';
import type { UseOrderItemsReturn } from './useOrderItems';
import { extractErrorMessage } from '@/utils/errorHandling';
import {
  isoToDateInputMX,
  isoToDateInputUTC,
  startOfDayUTC,
  preserveTimeOrStartOfDay
} from '@/utils/dateUtils';

export interface UseOrderFormOptions {
  currentUserId: number;
  orderId?: number | null;
  onOrderCreated: (order: Order) => void;
  onOrderUpdated?: (order: Order) => void;
  onClose: () => void;
  clientSearch: UseClientSearchReturn;
  orderItemsHook: UseOrderItemsReturn;
  formMethods: UseFormReturn<CreateOrderForm>;
}

export const useOrderForm = ({
  currentUserId,
  orderId = null,
  onOrderCreated,
  onOrderUpdated,
  onClose,
  clientSearch,
  orderItemsHook,
  formMethods,
}: UseOrderFormOptions) => {
  const isEditMode = orderId !== null && orderId !== undefined;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [originalOrderDate, setOriginalOrderDate] = useState<string | null>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [selectedProductForTemplate, setSelectedProductForTemplate] = useState<any>(null);

  const { setValue, reset: resetForm } = formMethods;

  // Función para cargar datos de la orden en modo edición
  const loadOrderData = useCallback(async (id: number) => {
    try {
      setLoadingOrder(true);
      setError(null);

      const orderData = await OrdersApiService.findById(id);

      // Llenar el formulario con los datos de la orden
      setValue('client_id', orderData.client_id);
      setOriginalOrderDate(orderData.date);
      // Convertir fecha a formato YYYY-MM-DD para el input type="date"
      const formattedDate = isoToDateInputMX(orderData.date);
      setValue('date', formattedDate);

      // Convertir fecha estimada si existe
      if (orderData.estimated_delivery_date) {
        const formattedEstimatedDate = isoToDateInputUTC(orderData.estimated_delivery_date);
        setValue('estimated_delivery_date', formattedEstimatedDate);
      } else {
        setValue('estimated_delivery_date', '');
      }
      setValue('status', orderData.status);
      setValue('responsable', orderData.responsable || 'Mostrador');
      setValue('notes', orderData.notes || '');
      setValue('description', orderData.description || '');

      // Configurar el cliente seleccionado
      clientSearch.setSelectedClientId(orderData.client_id);
      if (orderData.client) {
        clientSearch.setClientSearchTerm(`${orderData.client.name} - ${orderData.client.phone}`);
      }

      // Convertir los productos de la orden a OrderFormItem
      if (orderData.orderProducts && orderData.orderProducts.length > 0) {
        const loadedItems: OrderFormItem[] = orderData.orderProducts.map(op => {
          const itemType = getOrderItemType(op);

          if (itemType === 'product') {
            return {
              type: 'product' as const,
              id: op.product_id!,
              name: op.product_name || `Producto #${op.product_id}`,
              quantity: op.quantity,
              unit_price: op.unit_price,
              description: op.product_description,
              serial_number: op.serial_number,
              is_delivered: !!op.is_delivered,
              is_paid: !!op.is_paid
            };
          } else {
            // Es una plantilla
            const baseProductName = op.template_base_product_name || op.product_name || 'Producto';
            return {
              type: 'template' as const,
              id: op.template_id!,
              name: `${baseProductName} (Plantilla)`,
              quantity: op.quantity,
              unit_price: op.unit_price,
              description: op.template_description,
              width: op.template_width,
              height: op.template_height,
              colors: op.template_colors,
              position: op.template_position,
              texts: op.template_texts,
              is_delivered: !!op.is_delivered,
              is_paid: !!op.is_paid
            };
          }
        });

        orderItemsHook.setOrderItems(loadedItems);

        // Inicializar términos de búsqueda para cada item
        const initialSearchTerms: { [key: number]: string } = {};
        const initialCategories: { [key: number]: 'all' | 'products' | 'templates' } = {};

        loadedItems.forEach((item, index) => {
          if (item.type === 'product') {
            initialSearchTerms[index] = `${item.name}${item.serial_number ? ` (${item.serial_number})` : ''}`;
          } else {
            initialSearchTerms[index] = item.name;
          }
          initialCategories[index] = 'all';
        });

        orderItemsHook.setSearchTerms(initialSearchTerms);
        orderItemsHook.setSelectedCategory(initialCategories);
      }

      console.log('Datos de la orden cargados');
    } catch (err) {
      console.error('Error loading order:', err);
      const errorMessage = extractErrorMessage(err);
      setError(`Error al cargar la orden: ${errorMessage}`);
      toast.error('Error al cargar los datos de la orden');
    } finally {
      setLoadingOrder(false);
    }
  }, [setValue, clientSearch, orderItemsHook]);

  const onSubmit = useCallback(async (formData: any) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const { orderItems } = orderItemsHook;

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

      if (isEditMode && orderId) {
        // Modo edición
        const updateData = {
          client_id: formData.client_id,
          date: preserveTimeOrStartOfDay(formData.date, originalOrderDate),
          estimated_delivery_date: formData.estimated_delivery_date ? startOfDayUTC(formData.estimated_delivery_date) : undefined,
          status: formData.status,
          responsable: formData.responsable || 'Mostrador',
          notes: formData.notes || undefined,
          description: formData.description || undefined,
          items: items,
          edited_by: currentUserId
        };

        console.log('Datos de actualización:', updateData);

        const updatedOrder = await OrdersApiService.update(orderId, updateData as any);

        toast.success('Orden actualizada exitosamente');

        if (onOrderUpdated) {
          onOrderUpdated(updatedOrder);
        }
      } else {
        // Modo creación
        const orderData: CreateOrderForm = {
          client_id: formData.client_id,
          user_id: currentUserId,
          date: preserveTimeOrStartOfDay(formData.date, null),
          estimated_delivery_date: formData.estimated_delivery_date ? startOfDayUTC(formData.estimated_delivery_date) : undefined,
          status: formData.status || 'Revision',
          responsable: formData.responsable || 'Mostrador',
          notes: formData.notes || undefined,
          description: formData.description || undefined,
          items
        };

        console.log('Datos a enviar:', orderData);

        const newOrder = await OrdersApiService.create(orderData);

        toast.success('Orden creada exitosamente');
        onOrderCreated(newOrder);
      }

      handleClose();
    } catch (err: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} order`, err);
      const errorMessage = extractErrorMessage(err);
      setError(errorMessage);
      toast.error(`Error al ${isEditMode ? 'actualizar' : 'crear'} la orden`);
    } finally {
      setIsSubmitting(false);
    }
  }, [isEditMode, orderId, currentUserId, originalOrderDate, onOrderCreated, onOrderUpdated, orderItemsHook]);

  const handleClose = useCallback(() => {
    resetForm();
    orderItemsHook.reset();
    clientSearch.reset();
    setSelectedProductForTemplate(null);
    setOriginalOrderDate(null);
    setError(null);
    onClose();
  }, [resetForm, orderItemsHook, clientSearch, onClose]);

  // Crear plantilla desde producto seleccionado
  const createTemplateFromProduct = useCallback((productId: number) => {
    const product = orderItemsHook.products.find(p => p.id === productId);
    if (product) {
      setSelectedProductForTemplate(product);
      setShowCreateTemplateModal(true);
    }
  }, [orderItemsHook.products]);

  return {
    // State
    isEditMode,
    isSubmitting,
    error,
    setError,
    loadingOrder,

    // Modal state
    showCreateProductModal,
    setShowCreateProductModal,
    showCreateTemplateModal,
    setShowCreateTemplateModal,
    showCreateClientModal,
    setShowCreateClientModal,
    selectedProductForTemplate,
    setSelectedProductForTemplate,

    // Actions
    loadOrderData,
    onSubmit,
    handleClose,
    createTemplateFromProduct,
  };
};
