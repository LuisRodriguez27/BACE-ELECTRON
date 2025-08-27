import { Client, CreateClientForm, EditClientForm } from "../features/clients/types";
import { User, CreateUserForm, EditUserForm } from "../features/users/types";
import { Permission, CreatePermissionForm, EditPermissionForm } from "../features/permissions/types";
import { Product, CreateProductForm, EditProductForm } from "../features/products/types";
import { Order, CreateOrderForm, EditOrderForm, OrderProduct, CreateOrderProductForm, EditOrderProductForm } from "../features/orders/types";
import { Payment, CreatePaymentForm, EditPaymentForm } from "../features/payments/types";
import type { LoginCredentials, LoginResponse } from "@/features/auth/types";

declare global {
  interface Window {
    api: {
      // Autenticación
      login: (credentials: LoginCredentials) => Promise<LoginResponse>;
      logout: () => Promise<{ success: boolean; message: string }>;
      getCurrentUser: () => Promise<User | null>;
      isAuthenticated: () => Promise<boolean>;
      getUserWithPermissions: () => Promise<User | null>;
      requireAuth: () => Promise<{ success: boolean; message?: string }>;

      // Usuarios
      getAllUsers: () => Promise<User[]>;
      getUserById: (id: number) => Promise<User>;
      createUser: (data: CreateUserForm) => Promise<User>;
      updateUser: (id: number, data: EditUserForm) => Promise<User>;
      deleteUser: (id: number) => Promise<void>;
      verifyPassword: (data: LoginCredentials) => Promise<boolean>;

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
      addProductToOrder: (data: CreateOrderProductForm & { orderId: number }) => Promise<OrderProduct>;
      addProductsToOrder: (data: { orderId: number; products: CreateOrderProductForm[] }) => Promise<OrderProduct[]>;
      updateProductQuantity: (data: { orderId: number; productId: number; newQuantity: number }) => Promise<OrderProduct>;
      updateProductInOrder: (data: EditOrderProductForm & { orderProductId: number }) => Promise<OrderProduct>;
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
