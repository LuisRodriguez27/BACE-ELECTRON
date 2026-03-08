import type { 
  SimpleOrder, 
  CreateSimpleOrderForm, 
  SimpleOrderPayment,
  CreateSimpleOrderPaymentForm,
  UpdateSimpleOrderPaymentForm
} from './types';

export const SimpleOrdersApiService = {
  getAll: async (): Promise<SimpleOrder[]> => {
    return window.api.getAllSimpleOrders();
  },

  getById: async (id: number): Promise<SimpleOrder> => {
    return window.api.getSimpleOrderById(id);
  },

  create: async (data: CreateSimpleOrderForm): Promise<SimpleOrder> => {
    return window.api.createSimpleOrder(data);
  },

  update: async (id: number, data: Partial<CreateSimpleOrderForm>): Promise<SimpleOrder> => {
    return window.api.updateSimpleOrder(id, data);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteSimpleOrder(id);
  },

  addPayment: async (data: CreateSimpleOrderPaymentForm): Promise<SimpleOrderPayment> => {
    return window.api.addSimpleOrderPayment(data);
  },

  getPayments: async (id: number): Promise<SimpleOrderPayment[]> => {
    return window.api.getSimpleOrderPayments(id);
  },

  deletePayment: async (id: number): Promise<void> => {
    return window.api.deleteSimpleOrderPayment(id);
  },

  updatePayment: async (id: number, data: UpdateSimpleOrderPaymentForm): Promise<SimpleOrderPayment> => {
    return window.api.updateSimpleOrderPayment(id, data);
  }
};
