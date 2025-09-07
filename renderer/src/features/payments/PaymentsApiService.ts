import type { 
  Payment, 
  CreatePaymentForm
} from "./types";

export const PaymentsApiService = {
  getAll: async (): Promise<Payment[]> => {
    return window.api.getAllPayments();
  },

  findByOrderId: async (orderId: number): Promise<Payment[]> => {
    return window.api.getPaymentsByOrderId(orderId);
  },

  findById: async (id: number): Promise<Payment> => {
    return window.api.getPaymentById(id);
  },

  create: async (payment: CreatePaymentForm): Promise<Payment> => {
    return window.api.createPayment(payment);
  },

  update: async (id: number, payment: Payment): Promise<Payment> => {
    return window.api.updatePayment(id, payment);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deletePayment(id);
  },

  findByClientId: async (clientId: number): Promise<Payment[]> => {
    return window.api.getPaymentsByClientId(clientId);
  }
};
