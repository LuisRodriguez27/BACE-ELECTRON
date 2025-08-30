import type { 
  Payment, 
  CreatePaymentForm
} from "./types";

export const PaymentsApiService = {
  findByOrderId: async (orderId: number): Promise<Payment[]> => {
    return window.api.getPaymentsByOrderId(orderId);
  },

  findById: async (id: number): Promise<Payment> => {
    return window.api.getPaymentById(id);
  },

  create: async (payment: CreatePaymentForm): Promise<Payment> => {
    return window.api.createPayment(payment);
  },

  update: async (id: number, payment: { amount: number; descripcion?: string }): Promise<{ success: boolean; message: string; data?: Payment }> => {
    return window.api.updatePayment(id, payment);
  },

  delete: async (id: number): Promise<{ success: boolean; message: string }> => {
    return window.api.deletePayment(id);
  }
};
