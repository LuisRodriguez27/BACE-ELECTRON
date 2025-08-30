import type { 
  Order, 
  CreateOrderForm, 
  EditOrderForm, 
  OrderProduct, 
  CreateOrderProductForm
} from "./types";

export const OrdersApiService = {
  findAll: async (): Promise<Order[]> => {
    return window.api.getAllOrders();
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

  // Order Products methods
  getProducts: async (orderId: number): Promise<OrderProduct[]> => {
    return window.api.getProductsFromOrder(orderId);
  },

  addProduct: async (data: CreateOrderProductForm & { orderId: number }): Promise<OrderProduct> => {
    return window.api.addProductToOrder(data);
  },

  updateProductQuantity: async (data: { orderProductId: number; newQuantity: number; newPrice?: number }): Promise<OrderProduct> => {
    return window.api.updateProductQuantity(data);
  },

  removeProduct: async (orderProductId: number): Promise<void> => {
    return window.api.removeProductFromOrder(orderProductId);
  },

  clearProducts: async (orderId: number): Promise<void> => {
    return window.api.clearProductsFromOrder(orderId);
  }
};
