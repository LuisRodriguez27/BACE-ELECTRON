import { Button } from '@/components/ui';
import type { Client } from '@/features/clients/types';
import { useClientSearch } from '@/features/clients/hooks/useClientSearch';
import CreateClientModal from '@/features/clients/components/CreateClientModal';
import CreateTemplateModal from '@/features/productTemplates/components/CreateTemplateModal';
import QuickCreateProductModal from '@/features/products/components/QuickCreateProductModal';
import type { Product } from '@/features/products/types';
import type { ProductTemplate } from '@/features/productTemplates/types';
import { DollarSign, Edit3, Layers, Loader, Package, Plus, ReceiptText, X } from 'lucide-react';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { calculateOrderTotal, createOrderItemFromFormItem, createOrderSchema, type CreateOrderForm, type Order } from '../../types';
import { todayDateInputMX } from '@/utils/dateUtils';
import { toast } from 'sonner';
import { useNavigate } from '@tanstack/react-router';

// Hooks
import { useOrderItems } from './hooks/useOrderItems';
import { useOrderForm } from './hooks/useOrderForm';

// Components
import ClientSearchField from './components/ClientSearchField';
import OrderFormFields from './components/OrderFormFields';
import OrderItemRow from './components/OrderItemRow';

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderCreated: (order: Order) => void;
  currentUserId: number;
  orderId?: number | null;
  onOrderUpdated?: (order: Order) => void;
}

const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  onOrderCreated,
  currentUserId,
  orderId = null,
  onOrderUpdated
}) => {
  const navigate = useNavigate();
  // Initialize form at this level to avoid circular dependencies between hooks
  const formMethods = useForm<CreateOrderForm>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      user_id: currentUserId,
      date: todayDateInputMX(),
      status: 'Revision',
      responsable: 'Mostrador',
      items: []
    }
  });

  // Initialize hooks
  const orderItemsHook = useOrderItems();

  const clientSearch = useClientSearch({
    setValue: formMethods.setValue,
    unregister: formMethods.unregister,
  });

  const orderForm = useOrderForm({
    currentUserId,
    orderId,
    onOrderCreated,
    onOrderUpdated,
    onClose,
    clientSearch,
    orderItemsHook,
    formMethods,
  });

  // Sync form items when orderItems change
  useEffect(() => {
    const items = orderItemsHook.orderItems.map(createOrderItemFromFormItem);
    formMethods.setValue('items', items);
  }, [orderItemsHook.orderItems, formMethods.setValue]);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      clientSearch.loadClients();
      orderItemsHook.loadProducts();
      orderItemsHook.loadTemplates();

      if (orderForm.isEditMode && orderId) {
        orderForm.loadOrderData(orderId);
      }
    }
  }, [isOpen, orderForm.isEditMode, orderId]);

  const handleProductCreated = (_newProduct: Product) => {
    orderItemsHook.loadProducts();
  };

  const handleTemplateCreated = (_newTemplate: ProductTemplate) => {
    orderItemsHook.loadTemplates();
  };

  const handleClientCreated = (newClient: Client) => {
    clientSearch.handleClientCreated(newClient);
    toast.success(`Cliente "${newClient.name}" creado y seleccionado automáticamente`);
  };

  const onInvalid = (errors: any) => {
    const getFirstErrorMessage = (errs: any): string | null => {
      if (!errs) return null;
      if (typeof errs === 'object' && 'message' in errs && typeof errs.message === 'string') {
        return errs.message;
      }
      for (const key in errs) {
        if (errs[key] && typeof errs[key] === 'object') {
          const msg = getFirstErrorMessage(errs[key]);
          if (msg) return msg;
        }
      }
      return null;
    };

    const firstError = getFirstErrorMessage(errors);
    if (firstError) {
      toast.error(firstError);
    }
  };

  const total = calculateOrderTotal(orderItemsHook.orderItems);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${orderForm.isEditMode ? 'bg-orange-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
              {orderForm.isEditMode ? (
                <Edit3 className="h-5 w-5 text-orange-600" />
              ) : (
                <ReceiptText className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {orderForm.isEditMode ? 'Editar Orden' : 'Nueva Orden'}
              </h2>
              <p className="text-sm text-gray-500">
                {orderForm.isEditMode
                  ? `Editando orden #${orderId}`
                  : 'Crear orden con productos y/o plantillas'
                }
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={orderForm.handleClose}
            className="h-8 w-8 p-0"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={formMethods.handleSubmit(orderForm.onSubmit, onInvalid)} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
            <div className="pt-6 space-y-6">
              {orderForm.error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{orderForm.error}</p>
                </div>
              )}

              {/* Indicador de carga en modo edición */}
              {orderForm.isEditMode && orderForm.loadingOrder && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <Loader className="animate-spin h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-800">Cargando datos de la orden...</p>
                </div>
              )}

              {/* Información básica */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {/* Cliente */}
                <ClientSearchField
                  clientSearch={clientSearch}
                  register={formMethods.register}
                  errors={formMethods.formState.errors}
                  onOpenCreateClientModal={() => orderForm.setShowCreateClientModal(true)}
                />

                {/* Form fields */}
                <OrderFormFields
                  register={formMethods.register}
                  errors={formMethods.formState.errors}
                  setValue={formMethods.setValue}
                  watch={formMethods.watch}
                  total={total}
                />
              </div>
            </div>

            {/* Sección de Items (Productos y Plantillas) */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4 sticky top-0 bg-white z-20 py-3 -mx-6 px-6 border-b">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Productos y Plantillas</h3>
                  <span className="text-sm text-gray-500">({orderItemsHook.orderItems.length} items)</span>
                  {orderItemsHook.orderItems.length > 0 && (
                    <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-green-50 rounded-full">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-semibold text-green-700">
                        Subtotal: ${total.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => orderForm.setShowCreateProductModal(true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <Plus size={16} />
                    Crear Producto
                  </Button>
                  <Button
                    type="button"
                    onClick={orderItemsHook.addOrderItem}
                    className="flex items-center gap-2"
                    size="sm"
                    disabled={orderItemsHook.loadingProducts || orderItemsHook.loadingTemplates}
                  >
                    <Plus size={16} />
                    Agregar Item
                  </Button>
                </div>
              </div>

              {(orderItemsHook.loadingProducts || orderItemsHook.loadingTemplates) ? (
                <div className="flex items-center justify-center p-8 border border-dashed rounded-lg">
                  <Loader className="animate-spin" size={24} />
                  <span className="ml-2 text-gray-500">Cargando productos y plantillas...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {orderItemsHook.orderItems.length === 0 ? (
                    <div className="text-center p-8 border border-dashed rounded-lg text-gray-500">
                      <div className="flex items-center justify-center gap-2 mb-4">
                        <Package className="h-12 w-12 text-gray-300" />
                        <Layers className="h-12 w-12 text-gray-300" />
                      </div>
                      <p className="text-lg font-medium text-gray-700 mb-2">No hay productos o plantillas agregados</p>
                      <p className="text-sm mb-4">Haz clic en &quot;Agregar Item&quot; para comenzar a {orderForm.isEditMode ? 'editar' : 'crear'} tu orden</p>
                      <div className="flex flex-col items-center gap-2 text-xs text-gray-400">
                        <p>💡 <strong>Tip:</strong> Puedes crear productos y plantillas sobre la marcha</p>
                        <div className="flex items-center gap-4">
                          <span>🏷️ Filtra por tipo de item</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    orderItemsHook.orderItems.map((item, index) => (
                      <OrderItemRow
                        key={index}
                        index={index}
                        item={item}
                        orderItemsHook={orderItemsHook}
                        onCreateTemplateFromProduct={orderForm.createTemplateFromProduct}
                      />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-white flex-shrink-0 rounded-b-lg">
            {orderForm.isEditMode && orderId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  orderForm.handleClose();
                  navigate({
                    to: '/dashboard/suppliers',
                    search: { orderId: Number(orderId) } as any
                  });
                }}
                className="mr-auto flex items-center gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
              >
                <Layers size={16} />
                Surtir con Proveedor
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={orderForm.handleClose}
              disabled={orderForm.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={orderForm.isSubmitting || orderItemsHook.orderItems.length === 0 || orderForm.loadingOrder}
              className="flex items-center gap-2"
            >
              {orderForm.isSubmitting && <Loader className="animate-spin" size={16} />}
              {orderForm.isSubmitting
                ? (orderForm.isEditMode ? 'Actualizando...' : 'Creando...')
                : (orderForm.isEditMode ? `Actualizar Orden (${orderItemsHook.orderItems.length} items)` : `Crear Orden (${orderItemsHook.orderItems.length} items)`)
              }
            </Button>
          </div>
        </form>
      </div>

      {/* Modal de crear producto */}
      <QuickCreateProductModal
        isOpen={orderForm.showCreateProductModal}
        onClose={() => orderForm.setShowCreateProductModal(false)}
        onProductCreated={handleProductCreated}
        prefilledName=""
      />

      {/* Modal de crear cliente */}
      <CreateClientModal
        isOpen={orderForm.showCreateClientModal}
        onClose={() => orderForm.setShowCreateClientModal(false)}
        onClientCreated={handleClientCreated}
      />

      {/* Modal de crear plantilla */}
      {orderForm.selectedProductForTemplate && (
        <CreateTemplateModal
          isOpen={orderForm.showCreateTemplateModal}
          onClose={() => {
            orderForm.setShowCreateTemplateModal(false);
            orderForm.setSelectedProductForTemplate(null);
          }}
          onTemplateCreated={handleTemplateCreated}
          product={orderForm.selectedProductForTemplate}
        />
      )}
    </div>
  );
};

export default CreateOrderModal;
