import type { Supplier, CreateSupplierForm, EditSupplierForm, SupplierOrder, CreateSupplierOrderForm } from "./types";

export const SuppliersApiService = {
  // Suppliers CRUD
  findAll: async (): Promise<Supplier[]> => {
    return window.api.getAllSuppliers();
  },

  findById: async (id: number): Promise<Supplier> => {
    return window.api.getSupplierById(id);
  },

  create: async (supplier: CreateSupplierForm): Promise<Supplier> => {
    return window.api.createSupplier(supplier);
  },

  update: async (id: number, supplier: EditSupplierForm): Promise<Supplier> => {
    return window.api.updateSupplier(id, supplier);
  },

  delete: async (id: number): Promise<void> => {
    return window.api.deleteSupplier(id);
  },

  search: async (searchTerm: string): Promise<Supplier[]> => {
    return window.api.searchSuppliers(searchTerm);
  },

  // Supplier Orders CRUD
  findAllOrders: async (): Promise<SupplierOrder[]> => {
    return window.api.getAllSupplierOrders();
  },

  findOrderById: async (id: number): Promise<SupplierOrder> => {
    return window.api.getSupplierOrderById(id);
  },

  findOrdersBySupplierId: async (supplierId: number): Promise<SupplierOrder[]> => {
    return window.api.getSupplierOrdersBySupplierId(supplierId);
  },

  findOrdersByOrderId: async (orderId: number): Promise<SupplierOrder[]> => {
    return window.api.getSupplierOrdersByOrderId(orderId);
  },

  createOrder: async (order: CreateSupplierOrderForm): Promise<SupplierOrder> => {
    return window.api.createSupplierOrder(order);
  },

  updateOrder: async (id: number, order: Partial<CreateSupplierOrderForm>): Promise<SupplierOrder> => {
    return window.api.updateSupplierOrder(id, order);
  },

  deleteOrder: async (id: number): Promise<void> => {
    return window.api.deleteSupplierOrder(id);
  },

  getPreviousItems: async (supplierId: number): Promise<any[]> => {
    return window.api.getPreviousSupplierOrderItems(supplierId);
  }
};
