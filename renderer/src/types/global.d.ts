import { Client, CreateClientForm, EditClientForm } from "../features/clients/types";
import { User, CreateUserForm, EditUserForm } from "../features/users/types";
import { Permission, CreatePermissionForm, EditPermissionForm } from "../features/permissions/types";
import { Product, CreateProductForm, EditProductForm } from "../features/products/types";
import { Order, CreateOrderForm, EditOrderForm, OrderProduct } from "../features/orders/types";
import { Payment, CreatePaymentForm, EditPaymentForm } from "../features/payments/types";
import type { LoginData } from "@/features/auth/types";

declare global {
  interface Window {
    api: {
      // Usuarios
      getAllUsers: () => Promise<User[]>;
      getUserById: (id: number) => Promise<User>;
      createUser: (data: CreateUserForm) => Promise<User>;
      updateUser: (id: number, data: EditUserForm) => Promise<User>;
      deleteUser: (id: number) => Promise<void>;
      verifyPassword: (data: LoginData) => Promise<boolean>;

      // Permisos
      getAllPermissions: () => Promise<Permission[]>;
      getPermissionById: (id: number) => Promise<Permission>;
      getPermissionsByUserId: (userId: number) => Promise<Permission[]>;
      createPermission: (data: CreatePermissionForm) => Promise<Permission>;
      updatePermission: (id: number, data: EditPermissionForm) => Promise<Permission>;
      deletePermission: (id: number) => Promise<void>;
      assignPermissionToUser: (data: string) => Promise<void>;
      removePermissionFromUser: (data: string) => Promise<void>;

      // Clientes
      getAllClients: () => Promise<Client[]>;
      getClientById: (id: number) => Promise<Client>;
      createClient: (data: CreateClientForm) => Promise<Client>;
      updateClient: (id: number, data: EditClientForm) => Promise<Client>;
      deleteClient: (id: number) => Promise<void>;

      // Productos
      getAllProducts: () => Promise<Product[]>;
      getProductById: (id: number) => Promise<Product>;
      getActiveProducts: () => Promise<Product[]>;
      getInactiveProducts: () => Promise<Product[]>;
      createProduct: (data: CreateProductForm) => Promise<Product>;
      updateProduct: (id: number, data: EditProductForm) => Promise<Product>;
      deleteProduct: (id: number) => Promise<void>;
      removeProduct: (id: number) => Promise<void>;

      // Ordenes
      getAllOrders: () => Promise<Order[]>;
      getOrderById: (id: number) => Promise<Order>;
      getOrdersByClientId: (clientId: number) => Promise<Order[]>;
      createOrder: (data: CreateOrderForm) => Promise<Order>;
      updateOrder: (id: number, data: EditOrderForm) => Promise<Order>;
      deleteOrder: (id: number) => Promise<void>;
      addProductToOrder: (data: AddProductToOrderForm) => Promise<Order>;
      addProductsToOrder: (data: AddProductsToOrderForm) => Promise<Order>;
      updateProductQuantity: (data: UpdateProductQuantityForm) => Promise<OrderProduct>;
      updateProductInOrder: (data: UpdateProductInOrderForm) => Promise<OrderProduct>;
      removeProductFromOrder: (orderProductId: number) => Promise<void>;
      clearProductsFromOrder: (orderId: number) => Promise<void>;
      getProductsToOrder: (orderId: number) => Promise<OrderProduct[]>;

      // Pagos
      getPaymentsByOrderId: (orderId: number) => Promise<Payment[]>;
      getPaymentById: (id: number) => Promise<Payment>;
      createPayment: (data: CreatePaymentForm) => Promise<Payment>;
      updatePayment: (id: number, data: EditPaymentForm) => Promise<Payment>;
      deletePayment: (id: number) => Promise<void>;

    };
  }
}

export {};
