import { Client, CreateClientForm, EditClientForm } from "../features/clients/types";
import { User, CreateUserForm, EditUserForm } from "../features/users/types";
import { Permission, CreatePermissionForm, EditPermissionForm } from "../features/permissions/types";
import { Product, CreateProductForm, EditProductForm } from "../features/products/types";
import { ProductTemplate, CreateProductTemplateForm, EditProductTemplateForm } from "../features/productTemplates/types";
import { Order, CreateOrderForm, EditOrderForm, OrderProduct, CreateOrderProductForm, EditOrderProductForm } from "../features/orders/types";
import { Payment, CreatePaymentForm, EditPaymentForm } from "../features/payments/types";
import type { LoginCredentials, LoginResponse } from "@/features/auth/types";

declare global {
  interface Window {
    api: {
      // Usuarios
      getAllUsers: () => Promise<User[]>;
      getUserById: (id: number) => Promise<User>;
      createUser: (data: CreateUserForm) => Promise<User>;
      updateUser: (id: number, data: EditUserForm) => Promise<User>;
      deleteUser: (id: number) => Promise<void>;
      verifyPassword: (data: LoginCredentials) => Promise<boolean>;
      checkUsername: (username: string, excludeUserId?: number) => Promise<boolean>;

      // Autenticación
      login: (credentials: LoginCredentials) => Promise<LoginResponse>;
      logout: () => Promise<{ success: boolean; message: string }>;
      getCurrentUser: () => Promise<User | null>;
      isAuthenticated: () => Promise<boolean>;
      getUserWithPermissions: () => Promise<(User & { permissions: string[] }) | null>;
      requireAuth: () => Promise<{ success: boolean; message?: string }>;

      // Permisos
      getAllPermissions: () => Promise<Permission[]>;
      getPermissionsById: (id: number) => Promise<Permission>;
      getPermissionsByUserId: (userId: number) => Promise<Permission[]>;
      createPermission: (data: CreatePermissionForm) => Promise<Permission>;
      updatePermission: (id: number, data: EditPermissionForm) => Promise<{ success: boolean; message: string; data?: Permission }>;
      deletePermission: (id: number) => Promise<{ success: boolean; message: string }>;
      // Corregidos los tipos de parámetros - deben ser objetos, no strings
      assignPermissionToUser: (data: { userId: number; permissionId: number }) => Promise<{ success: boolean; message: string }>;
      removePermissionFromUser: (data: { userId: number; permissionId: number }) => Promise<{ success: boolean; message: string }>;

      // Clientes
      getAllClients: () => Promise<Client[]>;
      getClientById: (id: number) => Promise<Client>;
      createClient: (data: CreateClientForm) => Promise<Client>;
      updateClient: (id: number, data: EditClientForm) => Promise<Client>;
      deleteClient: (id: number) => Promise<void>;

      // Productos
      getAllProducts: () => Promise<Product[]>;
      getProductById: (id: number) => Promise<Product>;
      createProduct: (data: CreateProductForm) => Promise<Product>;
      updateProduct: (id: number, data: EditProductForm) => Promise<Product>;
      deleteProduct: (id: number) => Promise<void>;

      // Funciones avanzadas de productos
      getProductsWithTemplates: (productId: number) => Promise<Product & { templates: ProductTemplate[] }>;
      searchProducts: (searchTerm: string) => Promise<Product[]>;

      // Plantillas de productos
      getAllTemplates: () => Promise<ProductTemplate[]>;
      getTemplateById: (id: number) => Promise<ProductTemplate>;
      getTemplatesByProductId: (productId: number) => Promise<ProductTemplate[]>;
      createTemplate: (data: CreateProductTemplateForm) => Promise<ProductTemplate>;
      updateTemplate: (id: number, data: EditProductTemplateForm) => Promise<ProductTemplate>;
      deleteTemplate: (id: number) => Promise<void>;
      searchTemplate: (searchTerm: string) => Promise<ProductTemplate[]>;

      // Ordenes
      getAllOrders: () => Promise<Order[]>;
      getOrderById: (id: number) => Promise<Order>;
      getOrdersByClientId: (clientId: number) => Promise<Order[]>;
      createOrder: (data: CreateOrderForm) => Promise<Order>;
      updateOrder: (id: number, data: EditOrderForm) => Promise<Order>;
      deleteOrder: (id: number) => Promise<void>;
      recalculateOrderTotal: (id: number) => Promise<number>;
      getSales: () => Promise<Order[]>;

      // Pagos
      getPaymentsByOrderId: (orderId: number) => Promise<Payment[]>;
      getPaymentById: (id: number) => Promise<Payment>;
      createPayment: (data: CreatePaymentForm & { orderId: number; amount: number; date?: string; descripcion?: string }) => Promise<Payment>;
      updatePayment: (id: number, data: { amount: number; descripcion?: string }) => Promise<{ success: boolean; message: string; data?: Payment }>;
      deletePayment: (id: number) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};