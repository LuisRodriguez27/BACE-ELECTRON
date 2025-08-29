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
      // Autenticación
      login: (credentials: LoginCredentials) => Promise<LoginResponse>;
      logout: () => Promise<{ success: boolean; message: string }>;
      getCurrentUser: () => Promise<User | null>;
      isAuthenticated: () => Promise<boolean>;
      getUserWithPermissions: () => Promise<(User & { permissions: string[] }) | null>;
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
      getPermissionsById: (id: number) => Promise<Permission>;
      getPermissionsByUserId: (userId: number) => Promise<Permission[]>;
      createPermission: (data: CreatePermissionForm) => Promise<Permission>;
      updatePermission: (id: number, data: EditPermissionForm) => Promise<{ success: boolean; message: string } | Permission>;
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
      getActiveProducts: () => Promise<Product[]>;
      getInactiveProducts: () => Promise<Product[]>;
      createProduct: (data: CreateProductForm) => Promise<Product>;
      updateProduct: (id: number, data: EditProductForm) => Promise<Product>;
      deleteProduct: (id: number) => Promise<void>;
      removeProduct: (id: number) => Promise<void>;

      // Plantillas de productos
      getAllTemplates: () => Promise<ProductTemplate[]>;
      getTemplateById: (id: number) => Promise<ProductTemplate>;
      getTemplatesByProductId: (productId: number) => Promise<ProductTemplate[]>;
      getTemplatesByUserId: (userId: number) => Promise<ProductTemplate[]>;
      createTemplate: (data: CreateProductTemplateForm) => Promise<ProductTemplate>;
      updateTemplate: (id: number, data: EditProductTemplateForm) => Promise<ProductTemplate>;
      deleteTemplate: (id: number) => Promise<void>;
      createTemplateFromModification: (data: {
        product_id: number;
        modifications: {
          width?: number;
          height?: number;
          colors?: string | string[];
          position?: string;
        };
        created_by: number;
        templateDescription?: string;
      }) => Promise<ProductTemplate>;
      findSimilarTemplates: (productId: number, width: number, height: number, tolerance?: number) => Promise<ProductTemplate[]>;
      getTemplateUsageStats: () => Promise<{
        id: number;
        description: string;
        product_name: string;
        usage_count: number;
        last_used: string;
      }[]>;
      cloneTemplate: (templateId: number, createdBy: number, newDescription?: string) => Promise<{ success: boolean; template?: ProductTemplate; message?: string }>;

      // Ordenes
      getAllOrders: () => Promise<Order[]>;
      getOrderById: (id: number) => Promise<Order>;
      getOrdersByClientId: (clientId: number) => Promise<Order[]>;
      createOrder: (data: CreateOrderForm) => Promise<Order>;
      updateOrder: (id: number, data: EditOrderForm) => Promise<Order>;
      deleteOrder: (id: number) => Promise<void>;
      
      // Funciones del nuevo flujo de productos en órdenes
      addProductToOrder: (data: {
        orderId: number;
        products_id: number;
        quantity: number;
        price: number;
      }) => Promise<OrderProduct>;
      addProductWithModifications: (data: {
        orderId: number;
        products_id: number;
        quantity: number;
        price: number;
        modifications?: {
          width?: number;
          height?: number;
          colors?: string | string[];
          position?: string;
        };
        saveAsTemplate?: boolean;
        templateDescription?: string;
        created_by?: number;
      }) => Promise<{
        success: boolean;
        orderProduct: OrderProduct;
        templateCreated: boolean;
        templateId?: number;
      }>;
      addProductFromTemplate: (data: {
        orderId: number;
        template_id: number;
        quantity: number;
        price: number;
      }) => Promise<{
        success: boolean;
        orderProduct?: OrderProduct;
        message?: string;
      }>;
      addProductFromTemplateWithModifications: (data: {
        orderId: number;
        template_id: number;
        quantity: number;
        price: number;
        modifications?: {
          width?: number;
          height?: number;
          colors?: string | string[];
          position?: string;
          description?: string;
        };
        saveModificationsAs?: 'none' | 'update' | 'new';
        newTemplateDescription?: string;
        created_by?: number;
      }) => Promise<{
        success: boolean;
        orderProduct?: OrderProduct;
        templateUsed?: number;
        templateWasModified?: boolean;
        message?: string;
      }>;
      
      // Funciones de gestión de productos en orden
      updateProductQuantity: (data: {
        orderProductId: number;
        newQuantity: number;
        newPrice?: number;
      }) => Promise<OrderProduct>;
      updateProductTemplate: (data: {
        orderProductId: number;
        template_id?: number;
      }) => Promise<OrderProduct>;
      removeProductFromOrder: (orderProductId: number) => Promise<void>;
      clearProductsFromOrder: (orderId: number) => Promise<void>;
      getProductsFromOrder: (orderId: number) => Promise<OrderProduct[]>;
      
      // Funciones de consulta y estadísticas
      getOrdersUsingTemplate: (templateId: number) => Promise<Order[]>;
      getTemplateUsageInOrders: () => Promise<{
        template_id: number;
        template_description: string;
        product_name: string;
        usage_count: number;
        total_quantity: number;
        avg_price: number;
      }[]>;

      getSales: () => Promise<Order[]>;

      // Pagos
      getPaymentsByOrderId: (orderId: number) => Promise<Payment[]>;
      getPaymentById: (id: number) => Promise<Payment>;
      createPayment: (data: CreatePaymentForm & { orderId: number; amount: number; date?: string; descripcion?: string }) => Promise<Payment>;
      updatePayment: (id: number, data: { amount: number; descripcion?: string }) => Promise<{ success: boolean; message: string } | Payment>;
      deletePayment: (id: number) => Promise<{ success: boolean; message: string }>;
    };
  }
}

export {};