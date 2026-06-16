import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Usuarios
  getAllUsers: (): Promise<unknown> => ipcRenderer.invoke('users:getAll'),
  getUserById: (id: number): Promise<unknown> => ipcRenderer.invoke('users:getById', id),
  createUser: (data: unknown): Promise<unknown> => ipcRenderer.invoke('users:create', data),
  updateUser: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id: number): Promise<unknown> => ipcRenderer.invoke('users:delete', id),
  verifyPassword: (data: unknown): Promise<unknown> => ipcRenderer.invoke('users:verifyPassword', data),
  checkUsername: (username: string, excludeUserId?: number | null): Promise<boolean> =>
    ipcRenderer.invoke('users:checkUsername', username, excludeUserId),

  // Autenticación
  login: (credentials: unknown): Promise<unknown> => ipcRenderer.invoke('auth:login', credentials),
  logout: (): Promise<unknown> => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: (): Promise<unknown> => ipcRenderer.invoke('auth:getCurrentUser'),
  isAuthenticated: (): Promise<boolean> => ipcRenderer.invoke('auth:isAuthenticated'),
  getUserWithPermissions: (): Promise<unknown> => ipcRenderer.invoke('auth:getUserWithPermissions'),

  // Verificación de autenticación
  requireAuth: (): Promise<unknown> => ipcRenderer.invoke('auth:requireAuth'),

  // Permisos
  getAllPermissions: (): Promise<unknown> => ipcRenderer.invoke('permissions:getAll'),
  getPermissionsById: (id: number): Promise<unknown> => ipcRenderer.invoke('permissions:getById', id),
  getPermissionsByUserId: (userId: number): Promise<unknown> => ipcRenderer.invoke('permissions:getByUserId', userId),
  createPermission: (data: unknown): Promise<unknown> => ipcRenderer.invoke('permissions:create', data),
  updatePermission: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('permissions:update', id, data),
  deletePermission: (id: number): Promise<unknown> => ipcRenderer.invoke('permissions:delete', id),
  assignPermissionToUser: (data: unknown): Promise<unknown> => ipcRenderer.invoke('permissions:assignToUser', data),
  removePermissionFromUser: (data: unknown): Promise<unknown> => ipcRenderer.invoke('permissions:removeFromUser', data),

  // Clientes
  getAllClients: (): Promise<unknown> => ipcRenderer.invoke('clients:getAll'),
  getAllInvestedClients: (): Promise<unknown> => ipcRenderer.invoke('clients:getAllInvested'),
  getClientById: (id: number): Promise<unknown> => ipcRenderer.invoke('clients:getById', id),
  createClient: (data: unknown): Promise<unknown> => ipcRenderer.invoke('clients:create', data),
  updateClient: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('clients:update', id, data),
  deleteClient: (id: number): Promise<unknown> => ipcRenderer.invoke('clients:delete', id),
  searchClients: (searchTerm: string): Promise<unknown> => ipcRenderer.invoke('clients:search', searchTerm),
  getClientsPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('clients:getPaginated', page, limit, searchTerm),

  // Productos
  getAllProducts: (): Promise<unknown> => ipcRenderer.invoke('products:getAll'),
  getProductById: (id: number): Promise<unknown> => ipcRenderer.invoke('products:getById', id),
  createProduct: (data: unknown): Promise<unknown> => ipcRenderer.invoke('products:create', data),
  updateProduct: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id: number): Promise<unknown> => ipcRenderer.invoke('products:delete', id),

  // Funciones avanzadas de productos
  getProductWithTemplates: (productId: number): Promise<unknown> =>
    ipcRenderer.invoke('products:getWithTemplates', productId),
  getAllProductsWithTemplates: (): Promise<unknown> => ipcRenderer.invoke('products:getAllWithTemplates'),
  searchProducts: (searchTerm: string): Promise<unknown> => ipcRenderer.invoke('products:search', searchTerm),
  searchProductsWithTemplates: (searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('products:searchWithTemplates', searchTerm),
  getProductsPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('products:getPaginated', page, limit, searchTerm),
  findSimilarNames: (): Promise<unknown> => ipcRenderer.invoke('products:findSimilarNames'),

  // Plantillas de productos
  getAllTemplates: (): Promise<unknown> => ipcRenderer.invoke('templates:getAll'),
  getTemplateById: (id: number): Promise<unknown> => ipcRenderer.invoke('templates:getById', id),
  getTemplatesByProductId: (productId: number): Promise<unknown> =>
    ipcRenderer.invoke('templates:getByProductId', productId),
  createTemplate: (data: unknown): Promise<unknown> => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('templates:update', id, data),
  deleteTemplate: (id: number): Promise<unknown> => ipcRenderer.invoke('templates:delete', id),

  // Funciones especiales de plantillas
  searchTemplates: (searchTerm: string): Promise<unknown> => ipcRenderer.invoke('templates:search', searchTerm),
  getTemplatesPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('templates:getPaginated', page, limit, searchTerm),

  // Ordenes
  getAllOrders: (): Promise<unknown> => ipcRenderer.invoke('orders:getAll'),
  getPendingOrdersForLogbook: (): Promise<unknown> => ipcRenderer.invoke('orders:getPendingForLogbook'),
  getOrderById: (id: number): Promise<unknown> => ipcRenderer.invoke('orders:getById', id),
  getOrdersByClientId: (clientId: number): Promise<unknown> => ipcRenderer.invoke('orders:getByClientId', clientId),
  createOrder: (data: unknown): Promise<unknown> => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id: number): Promise<unknown> => ipcRenderer.invoke('orders:delete', id),
  recalculateOrderTotal: (orderId: number): Promise<unknown> =>
    ipcRenderer.invoke('orders:recalculateTotal', orderId),
  getSales: (): Promise<unknown> => ipcRenderer.invoke('sales:getAll'),
  getSalesPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('sales:getPaginated', page, limit, searchTerm),
  searchSales: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('sales:search', page, limit, searchTerm),
  getOrderProducts: (orderId: number): Promise<unknown> => ipcRenderer.invoke('orders:getProducts', orderId),

  // Pagos
  getAllPayments: (): Promise<unknown> => ipcRenderer.invoke('payments:getAll'),
  getPaymentsPaginated: (page: number, limit: number, filters: unknown): Promise<unknown> =>
    ipcRenderer.invoke('payments:getPaginated', page, limit, filters),
  getPaymentsByOrderId: (orderId: number): Promise<unknown> =>
    ipcRenderer.invoke('payments:getPaymentsByOrderId', orderId),
  getPaymentById: (id: number): Promise<unknown> => ipcRenderer.invoke('payments:getById', id),
  createPayment: (data: unknown): Promise<unknown> => ipcRenderer.invoke('payments:create', data),
  updatePayment: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('payments:update', id, data),
  deletePayment: (id: number): Promise<unknown> => ipcRenderer.invoke('payments:delete', id),
  getPaymentsByClientId: (clientId: number): Promise<unknown> =>
    ipcRenderer.invoke('payments:getByClientId', clientId),

  // Presupuestos
  getAllBudgets: (): Promise<unknown> => ipcRenderer.invoke('budgets:getAll'),
  getBudgetsPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('budgets:getPaginated', page, limit, searchTerm),
  searchBudgets: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('budgets:search', page, limit, searchTerm),
  getBudgetById: (id: number): Promise<unknown> => ipcRenderer.invoke('budgets:getById', id),
  getBudgetByClientId: (clientId: number): Promise<unknown> =>
    ipcRenderer.invoke('budgets:getByClientId', clientId),
  createBudget: (data: unknown): Promise<unknown> => ipcRenderer.invoke('budgets:create', data),
  updateBudget: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('budgets:update', id, data),
  deleteBudget: (id: number): Promise<unknown> => ipcRenderer.invoke('budgets:delete', id),
  getBudgetProducts: (budgetId: number): Promise<unknown> => ipcRenderer.invoke('budgets:getProducts', budgetId),
  recalculateBudgetTotal: (budgetId: number): Promise<unknown> =>
    ipcRenderer.invoke('budgets:recalculateTotal', budgetId),
  transformToOrder: (budgetId: number, userId: number): Promise<unknown> =>
    ipcRenderer.invoke('budgets:transformToOrder', budgetId, userId),
  getBudgetNextId: (): Promise<unknown> => ipcRenderer.invoke('budgets:getNextId'),

  // Stats
  getSalesStats: (params: unknown): Promise<unknown> => ipcRenderer.invoke('stats:getSales', params),
  getStatsProducts: (): Promise<unknown> => ipcRenderer.invoke('stats:getProducts'),
  getAvailableYears: (): Promise<unknown> => ipcRenderer.invoke('stats:getYears'),
  getAvailableWeeks: (year: number): Promise<unknown> => ipcRenderer.invoke('stats:getWeeks', year),

  // Ordenes rapidas (Simple Orders)
  getAllSimpleOrders: (): Promise<unknown> => ipcRenderer.invoke('simpleOrders:getAll'),
  getSimpleOrdersPaginated: (page: number, limit: number, searchTerm: string): Promise<unknown> =>
    ipcRenderer.invoke('simpleOrders:getPaginated', page, limit, searchTerm),
  getSimpleOrderById: (id: number): Promise<unknown> => ipcRenderer.invoke('simpleOrders:getById', id),
  createSimpleOrder: (data: unknown): Promise<unknown> => ipcRenderer.invoke('simpleOrders:create', data),
  updateSimpleOrder: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('simpleOrders:update', id, data),
  deleteSimpleOrder: (id: number): Promise<unknown> => ipcRenderer.invoke('simpleOrders:delete', id),
  addSimpleOrderPayment: (data: unknown): Promise<unknown> => ipcRenderer.invoke('simpleOrders:addPayment', data),
  getSimpleOrderPayments: (id: number): Promise<unknown> => ipcRenderer.invoke('simpleOrders:getPayments', id),
  updateSimpleOrderPayment: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('simpleOrders:updatePayment', id, data),
  deleteSimpleOrderPayment: (id: number): Promise<unknown> =>
    ipcRenderer.invoke('simpleOrders:deletePayment', id),

  // Sesiones de caja
  getCashSessions: (page: number, limit: number): Promise<unknown> =>
    ipcRenderer.invoke('cashSessions:getAll', page, limit),
  getClosedCashSessions: (page: number, limit: number): Promise<unknown> =>
    ipcRenderer.invoke('cashSessions:getClosed', page, limit),
  getActiveCashSession: (): Promise<unknown> => ipcRenderer.invoke('cashSessions:getActive'),
  getCashSessionById: (id: number): Promise<unknown> => ipcRenderer.invoke('cashSessions:getById', id),
  getCashSessionsByDateRange: (from: string, to: string): Promise<unknown> =>
    ipcRenderer.invoke('cashSessions:getByDateRange', from, to),
  getCashSessionSummary: (id: number): Promise<unknown> => ipcRenderer.invoke('cashSessions:getSummary', id),
  openCashSession: (data: unknown): Promise<unknown> => ipcRenderer.invoke('cashSessions:open', data),
  closeCashSession: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('cashSessions:close', id, data),
  updateCashSession: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('cashSessions:update', id, data),
  reopenCashSession: (id: number): Promise<unknown> => ipcRenderer.invoke('cashSessions:reopen', id),

  // Gastos
  getExpenses: (page: number, limit: number): Promise<unknown> =>
    ipcRenderer.invoke('expenses:getAll', page, limit),
  getExpensesByCashSession: (cashSessionId: number): Promise<unknown> =>
    ipcRenderer.invoke('expenses:getByCashSession', cashSessionId),
  getExpenseById: (id: number): Promise<unknown> => ipcRenderer.invoke('expenses:getById', id),
  createExpense: (data: unknown): Promise<unknown> => ipcRenderer.invoke('expenses:create', data),
  updateExpense: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('expenses:update', id, data),
  deleteExpense: (id: number): Promise<unknown> => ipcRenderer.invoke('expenses:delete', id),

  // Proveedores (Suppliers)
  getAllSuppliers: (): Promise<unknown> => ipcRenderer.invoke('suppliers:getAll'),
  getSupplierById: (id: number): Promise<unknown> => ipcRenderer.invoke('suppliers:getById', id),
  createSupplier: (data: unknown): Promise<unknown> => ipcRenderer.invoke('suppliers:create', data),
  updateSupplier: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('suppliers:update', id, data),
  deleteSupplier: (id: number): Promise<unknown> => ipcRenderer.invoke('suppliers:delete', id),
  searchSuppliers: (searchTerm: string): Promise<unknown> => ipcRenderer.invoke('suppliers:search', searchTerm),

  // Ordenes de Proveedor (Supplier Orders)
  getAllSupplierOrders: (): Promise<unknown> => ipcRenderer.invoke('supplierOrders:getAll'),
  getSupplierOrderById: (id: number): Promise<unknown> => ipcRenderer.invoke('supplierOrders:getById', id),
  getSupplierOrdersBySupplierId: (supplierId: number): Promise<unknown> =>
    ipcRenderer.invoke('supplierOrders:getBySupplierId', supplierId),
  getSupplierOrdersByOrderId: (orderId: number): Promise<unknown> =>
    ipcRenderer.invoke('supplierOrders:getByOrderId', orderId),
  createSupplierOrder: (data: unknown): Promise<unknown> => ipcRenderer.invoke('supplierOrders:create', data),
  updateSupplierOrder: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('supplierOrders:update', id, data),
  deleteSupplierOrder: (id: number): Promise<unknown> => ipcRenderer.invoke('supplierOrders:delete', id),
  getPreviousSupplierOrderItems: (supplierId: number): Promise<unknown> =>
    ipcRenderer.invoke('supplierOrders:getPreviousItems', supplierId),

  // Bitácora de Impresión (Print Logs)
  getActivePrintLogs: (): Promise<unknown> => ipcRenderer.invoke('printLogs:getActive'),
  getPrintLogsPaginated: (page: number, limit: number, searchTerm: string, searchDate: string | null): Promise<unknown> =>
    ipcRenderer.invoke('printLogs:getPaginated', page, limit, searchTerm, searchDate),
  getPrintLogsHistoryDays: (
    todayLocalStr: string,
    page: number,
    limit: number,
    searchTerm: string,
    searchDate: string | null
  ): Promise<unknown> =>
    ipcRenderer.invoke('printLogs:getHistoryDays', todayLocalStr, page, limit, searchTerm, searchDate),
  getPrintLogsByDay: (dateLocalStr: string): Promise<unknown> =>
    ipcRenderer.invoke('printLogs:getByDay', dateLocalStr),
  getPrintLogById: (id: number): Promise<unknown> => ipcRenderer.invoke('printLogs:getById', id),
  getPrintLogsByOrderId: (orderId: number): Promise<unknown> =>
    ipcRenderer.invoke('printLogs:getByOrderId', orderId),
  createPrintLog: (data: unknown): Promise<unknown> => ipcRenderer.invoke('printLogs:create', data),
  updatePrintLog: (id: number, data: unknown): Promise<unknown> => ipcRenderer.invoke('printLogs:update', id, data),
  updatePrintLogCheckboxes: (id: number, data: unknown): Promise<unknown> =>
    ipcRenderer.invoke('printLogs:updateCheckboxes', id, data),
  deletePrintLog: (id: number): Promise<unknown> => ipcRenderer.invoke('printLogs:delete', id),

  // Imágenes en NAS
  uploadImage: (productId: number, buffer: unknown, originalName: string): Promise<unknown> =>
    ipcRenderer.invoke('upload-image', productId, buffer, originalName),
  deleteImage: (relativePath: string): Promise<unknown> => ipcRenderer.invoke('delete-image', relativePath),

  // Abrir URL en el navegador predeterminado del sistema
  openExternal: (url: string): Promise<unknown> => ipcRenderer.invoke('shell:openExternal', url),

  // WhatsApp
  openWhatsApp: (): Promise<unknown> => ipcRenderer.invoke('whatsapp:open'),

  // Actualizaciones automáticas
  updater: {
    onUpdateAvailable: (callback: (info: { version: string }) => void): void => {
      ipcRenderer.on('updater:update-available', (_event, info) => callback(info as { version: string }));
    },
    onUpdateDownloaded: (callback: (data: { version: string; notes: string }) => void): void => {
      ipcRenderer.on('updater:update-downloaded', (_event, data) =>
        callback(data as { version: string; notes: string })
      );
    },
    removeAllListeners: (): void => {
      ipcRenderer.removeAllListeners('updater:update-available');
      ipcRenderer.removeAllListeners('updater:update-downloaded');
    },
    install: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  },
});
