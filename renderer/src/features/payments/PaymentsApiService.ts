import type {
  Payment,
  CreatePaymentForm,
  EditPaymentForm,
  PaymentFilters,
  PaginatedPayments,
} from "./types";

export const PaymentsApiService = {
  getAll: async (): Promise<Payment[]> => {
    return window.api.getAllPayments();
  },

  getPaginated: async (page: number, limit: number, filters?: PaymentFilters): Promise<PaginatedPayments> => {
    return window.api.getPaymentsPaginated(page, limit, filters);
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

  update: async (id: number, payment: EditPaymentForm): Promise<Payment> => {
    return window.api.updatePayment(id, payment);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deletePayment(id);
  },

  findByClientId: async (clientId: number): Promise<Payment[]> => {
    return window.api.getPaymentsByClientId(clientId);
  }
};
