import type { 
  Order, 
  CreateOrderForm, 
  EditOrderForm, 
  OrderProduct, 
  CreateOrderProductForm, 
  EditOrderProductForm 
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
    return window.api.getProductsToOrder(orderId);
  },

  addProduct: async (data: CreateOrderProductForm & { orderId: number }): Promise<OrderProduct> => {
    return window.api.addProductToOrder(data);
  },

  addProducts: async (data: { orderId: number; products: CreateOrderProductForm[] }): Promise<OrderProduct[]> => {
    return window.api.addProductsToOrder(data);
  },

  updateProduct: async (data: EditOrderProductForm & { orderProductId: number }): Promise<OrderProduct> => {
    return window.api.updateProductInOrder(data);
  },

  updateProductQuantity: async (data: { orderId: number; productId: number; newQuantity: number }): Promise<OrderProduct> => {
    return window.api.updateProductQuantity(data);
  },

  removeProduct: async (orderProductId: number): Promise<void> => {
    return window.api.removeProductFromOrder(orderProductId);
  },

  clearProducts: async (orderId: number): Promise<void> => {
    return window.api.clearProductsFromOrder(orderId);
  }
};
