import type { 
  Order, 
  CreateOrderForm, 
  EditOrderForm,
  OrderProduct, 
} from "./types";

export const OrdersApiService = {
  findAll: async (): Promise<Order[]> => {
    return window.api.getAllOrders();
  },

  findPendingForLogbook: async (): Promise<Order[]> => {
    return window.api.getPendingOrdersForLogbook();
  },

  findById: async (id: number): Promise<Order> => {
    return window.api.getOrderById(id);
  },

  findByClientId: async (clientId: number): Promise<Order[]> => {
    return window.api.getOrdersByClientId(clientId);
  },

  create: async (order: CreateOrderForm): Promise<Order> => {
    return window.api.createOrder(order);
  },

  update: async (id: number, order: EditOrderForm): Promise<Order> => {
    return window.api.updateOrder(id, order);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteOrder(id);
  },

  recalculateTotal: async (id: number): Promise<number> => {
    return window.api.recalculateOrderTotal(id);
  },

  getSales: async (): Promise<Order[]> => {
    return window.api.getSales();
  },

  getOrderProducts: async (orderId: number): Promise<OrderProduct[]> => {
    return window.api.getOrderProducts(orderId);
  }
};
