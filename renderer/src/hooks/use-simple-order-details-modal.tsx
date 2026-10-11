import { useState } from 'react';
import SimpleOrderDetailsModal from '@/features/simpleOrders/components/SimpleOrderDetailsModal';

export function useSimpleOrderDetailsModal() {
  const [selectedSimpleOrderId, setSelectedSimpleOrderId] = useState<number | null>(null);

  const openSimpleOrder = (orderId: number) => setSelectedSimpleOrderId(orderId);
  const closeSimpleOrder = () => setSelectedSimpleOrderId(null);

  const simpleOrderDetailsModal = (
    <SimpleOrderDetailsModal
      isOpen={selectedSimpleOrderId !== null}
      onClose={closeSimpleOrder}
      orderId={selectedSimpleOrderId}
    />
  );

  return { openSimpleOrder, simpleOrderDetailsModal };
}
