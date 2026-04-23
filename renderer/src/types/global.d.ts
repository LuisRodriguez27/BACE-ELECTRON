import { Client, CreateClientForm, EditClientForm } from "../features/clients/types";
import { User, CreateUserForm, EditUserForm } from "../features/users/types";
import { Permission, CreatePermissionForm, EditPermissionForm } from "../features/permissions/types";
import { Product, CreateProductForm, EditProductForm, SimilarNameResult } from "../features/products/types";
import { ProductTemplate, CreateProductTemplateForm, EditProductTemplateForm } from "../features/productTemplates/types";
import { Order, CreateOrderForm, EditOrderForm, OrderProduct, CreateOrderProductForm, EditOrderProductForm } from "../features/orders/types";
import { Payment, CreatePaymentForm, EditPaymentForm } from "../features/payments/types";
import type { LoginCredentials, LoginResponse } from "@/features/auth/types";
import type { Budget, BudgetProduct, CreateBudgetForm } from "@/features/budgets";
import {
  SimpleOrder,
  CreateSimpleOrderForm,
  SimpleOrderPayment,
  CreateSimpleOrderPaymentForm,
  UpdateSimpleOrderPaymentForm
} from "../features/simpleOrders/types";
import type {
  CashSession,
  CashSessionSummary,
  Expense,
  CreateExpenseForm,
  UpdateExpenseForm,
  OpenCashSessionForm,
  CloseCashSessionForm,
  UpdateCashSessionForm,
  PaginatedResult,
} from "../features/cashSession/types";

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
      updatePermission: (id: number, data: EditPermissionForm) => Promise<Permission>;
      deletePermission: (id: number) => Promise<void>;
      // Corregidos los tipos de parámetros - deben ser objetos, no strings
      assignPermissionToUser: (data: { userId: number; permissionId: number }) => Promise<User>;
      removePermissionFromUser: (data: { userId: number; permissionId: number }) => Promise<User>;

      // Clientes
      getAllClients: () => Promise<Client[]>;
      getClientById: (id: number) => Promise<Client>;
      createClient: (data: CreateClientForm) => Promise<Client>;
      updateClient: (id: number, data: EditClientForm) => Promise<Client>;
      deleteClient: (id: number) => Promise<void>;
      searchClients: (searchTerm: string) => Promise<Client[]>;

      // Productos
      getAllProducts: () => Promise<Product[]>;
      getProductById: (id: number) => Promise<Product>;
      createProduct: (data: CreateProductForm) => Promise<Product>;
      updateProduct: (id: number, data: EditProductForm) => Promise<Product>;
      deleteProduct: (id: number) => Promise<void>;

      // Imágenes en NAS
      uploadImage: (productId: number, buffer: Uint8Array | ArrayBuffer, originalName: string) => Promise<{ success: boolean; relativePath: string }>;
      deleteImage: (relativePath: string) => Promise<{ success: boolean; message?: string }>;

      // Funciones avanzadas de productos
      getProductWithTemplates: (productId: number) => Promise<Product & { templates: ProductTemplate[] }>;
      getAllProductsWithTemplates: () => Promise<(Product & { templates: ProductTemplate[] })[]>;
      searchProducts: (searchTerm: string) => Promise<Product[]>;
      findSimilarNames: () => Promise<SimilarNameResult[]>;

      // Plantillas de productos
      getAllTemplates: () => Promise<ProductTemplate[]>;
      getTemplateById: (id: number) => Promise<ProductTemplate>;
      getTemplatesByProductId: (productId: number) => Promise<ProductTemplate[]>;
      createTemplate: (data: CreateProductTemplateForm) => Promise<ProductTemplate>;
      updateTemplate: (id: number, data: EditProductTemplateForm) => Promise<ProductTemplate>;
      deleteTemplate: (id: number) => Promise<void>;
      searchTemplates: (searchTerm: string) => Promise<ProductTemplate[]>;

      // Ordenes
      getAllOrders: () => Promise<Order[]>;
      getPendingOrdersForLogbook: () => Promise<Order[]>;
      getOrderById: (id: number) => Promise<Order>;
      getOrdersByClientId: (clientId: number) => Promise<Order[]>;
      createOrder: (data: CreateOrderForm) => Promise<Order>;
      updateOrder: (id: number, data: EditOrderForm) => Promise<Order>;
      deleteOrder: (id: number) => Promise<void>;
      recalculateOrderTotal: (id: number) => Promise<number>;
      getSales: () => Promise<Order[]>;
      getSalesPaginated: (page: number, limit: number, searchTerm: string) => Promise<{ data: Order[], pagination: { page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean } }>;
      searchSales: (page: number, limit: number, searchTerm: string) => Promise<{ data: Order[], pagination: { page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean } }>;
      getOrderProducts: (orderId: number) => Promise<OrderProduct[]>;

      // Pagos
      getAllPayments: () => Promise<Payment[]>;
      getPaymentsByOrderId: (orderId: number) => Promise<Payment[]>;
      getPaymentById: (id: number) => Promise<Payment>;
      createPayment: (data: CreatePaymentForm) => Promise<Payment>;
      updatePayment: (id: number, data: EditPaymentForm) => Promise<Payment>;
      deletePayment: (id: number) => Promise<void>;
      getPaymentsByClientId: (clientId: number) => Promise<Payment[]>;

      // Presupuestos
      getAllBudgets: () => Promise<Budget[]>;
      getBudgetsPaginated: (page: number, limit: number, searchTerm: string) => Promise<{ data: Budget[], pagination: { page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean } }>;
      searchBudgets: (page: number, limit: number, searchTerm: string) => Promise<{ data: Budget[], pagination: { page: number, limit: number, total: number, totalPages: number, hasNext: boolean, hasPrev: boolean } }>;
      getBudgetById: (id: number) => Promise<Budget>;
      getBudgetByClientId: (clientId: number) => Promise<Budget[]>;
      createBudget: (data: CreateBudgetForm) => Promise<Budget>;
      updateBudget: (id: number, data: Partial<CreateBudgetForm>) => Promise<Budget>;
      deleteBudget: (budgetId: number) => Promise<void>;
      getBudgetProducts: (budgetId: number) => Promise<BudgetProduct[]>;
      recalculateBudgetTotal: (budgetId: number) => Promise<number>;
      transformToOrder: (budgetId, userId) => Promise<Order>;
      getBudgetNextId: () => Promise<number>;

      // Stats
      getSalesStats: (params: any) => Promise<any>;
      getStatsProducts: () => Promise<any>;
      getAvailableYears: () => Promise<number[]>;
      getAvailableWeeks: (year: number) => Promise<number[]>;

      // Órdenes Rápidas (Simple Orders)
      getAllSimpleOrders: () => Promise<SimpleOrder[]>;
      getSimpleOrderById: (id: number) => Promise<SimpleOrder>;
      createSimpleOrder: (data: CreateSimpleOrderForm) => Promise<SimpleOrder>;
      updateSimpleOrder: (id: number, data: Partial<CreateSimpleOrderForm>) => Promise<SimpleOrder>;
      deleteSimpleOrder: (id: number) => Promise<void>;

      // Pagos de Órdenes Rápidas
      addSimpleOrderPayment: (data: CreateSimpleOrderPaymentForm) => Promise<SimpleOrderPayment>;
      getSimpleOrderPayments: (id: number) => Promise<SimpleOrderPayment[]>;
      updateSimpleOrderPayment: (id: number, data: UpdateSimpleOrderPaymentForm) => Promise<SimpleOrderPayment>;
      deleteSimpleOrderPayment: (id: number) => Promise<void>;

      // Sesiones de caja
      getCashSessions: (page: number, limit: number) => Promise<PaginatedResult<CashSession>>;
      getClosedCashSessions: (page: number, limit: number) => Promise<PaginatedResult<CashSession>>;
      getActiveCashSession: () => Promise<CashSession | null>;
      getCashSessionById: (id: number) => Promise<CashSession>;
      getCashSessionsByDateRange: (from: string, to: string) => Promise<CashSession[]>;
      getCashSessionSummary: (id: number) => Promise<CashSessionSummary>;
      openCashSession: (data: OpenCashSessionForm) => Promise<CashSession>;
      closeCashSession: (id: number, data: CloseCashSessionForm) => Promise<CashSession>;
      updateCashSession: (id: number, data: UpdateCashSessionForm) => Promise<CashSession>;

      // Gastos
      getExpenses: (page: number, limit: number) => Promise<PaginatedResult<Expense>>;
      getExpensesByCashSession: (cashSessionId: number) => Promise<Expense[]>;
      getExpenseById: (id: number) => Promise<Expense>;
      createExpense: (data: CreateExpenseForm) => Promise<Expense>;
      updateExpense: (id: number, data: UpdateExpenseForm) => Promise<Expense>;
      deleteExpense: (id: number) => Promise<void>;

      // Shell / Utilidades
      openExternal: (url: string) => Promise<void>;
      openWhatsApp: () => Promise<void>;

      // Actualizaciones automáticas
      updater: {
        onUpdateAvailable: (callback: (info: { version: string }) => void) => void;
        onUpdateDownloaded: (callback: (info: { version: string, notes: string }) => void) => void;
        removeAllListeners: () => void;
        install: () => Promise<void>;
      };
    };
  }
}

export { };