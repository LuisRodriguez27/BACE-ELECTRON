import { useState } from 'react';
import OrderDetailsModal from '@/features/orders/components/OrderDetailsModal';

export function useOrderDetailsModal() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const openOrder = (orderId: number) => setSelectedOrderId(orderId);
  const closeOrder = () => setSelectedOrderId(null);

  const orderDetailsModal = (
    <OrderDetailsModal
      isOpen={selectedOrderId !== null}
      onClose={closeOrder}
      orderId={selectedOrderId}
    />
  );

  return { openOrder, orderDetailsModal };
}
