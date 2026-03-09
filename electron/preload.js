const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Usuarios
  getAllUsers: () => ipcRenderer.invoke('users:getAll'),
  getUserById: (id) => ipcRenderer.invoke('users:getById', id),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  verifyPassword: (data) => ipcRenderer.invoke('users:verifyPassword', data),
  checkUsername: (username, excludeUserId) => ipcRenderer.invoke('users:checkUsername', username, excludeUserId),

  // Autenticación
  login: (credentials) => ipcRenderer.invoke('auth:login', credentials),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser'),
  isAuthenticated: () => ipcRenderer.invoke('auth:isAuthenticated'),
  getUserWithPermissions: () => ipcRenderer.invoke('auth:getUserWithPermissions'),
  
  // Verificación de autenticación
  requireAuth: () => ipcRenderer.invoke('auth:requireAuth'),

  // Permisos
  getAllPermissions: () => ipcRenderer.invoke('permissions:getAll'),
  getPermissionsById: (id) => ipcRenderer.invoke('permissions:getById', id),
  getPermissionsByUserId: (userId) => ipcRenderer.invoke('permissions:getByUserId', userId),
  createPermission: (data) => ipcRenderer.invoke('permissions:create', data),
  updatePermission: (id, data) => ipcRenderer.invoke('permissions:update', id, data),
  deletePermission: (id) => ipcRenderer.invoke('permissions:delete', id),
  assignPermissionToUser: (data) => ipcRenderer.invoke('permissions:assignToUser', data),
  removePermissionFromUser: (data) => ipcRenderer.invoke('permissions:removeFromUser', data),

  // Clientes
  getAllClients: () => ipcRenderer.invoke('clients:getAll'),
  getClientById: (id) => ipcRenderer.invoke('clients:getById', id),
  createClient: (data) => ipcRenderer.invoke('clients:create', data),
  updateClient: (id, data) => ipcRenderer.invoke('clients:update', id, data),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),
  searchClients: (searchTerm) => ipcRenderer.invoke('clients:search', searchTerm),

  // Productos
  getAllProducts: () => ipcRenderer.invoke('products:getAll'),
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // Funciones avanzadas de productos
  getProductWithTemplates: (productId) => ipcRenderer.invoke('products:getWithTemplates', productId),
  getAllProductsWithTemplates: () => ipcRenderer.invoke('products:getAllWithTemplates'),
  searchProducts: (searchTerm) => ipcRenderer.invoke('products:search', searchTerm),
  findSimilarNames: () => ipcRenderer.invoke('products:findSimilarNames'),

  // Plantillas de productos
  getAllTemplates: () => ipcRenderer.invoke('templates:getAll'),
  getTemplateById: (id) => ipcRenderer.invoke('templates:getById', id),
  getTemplatesByProductId: (productId) => ipcRenderer.invoke('templates:getByProductId', productId),
  createTemplate: (data) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (id, data) => ipcRenderer.invoke('templates:update', id, data),
  deleteTemplate: (id) => ipcRenderer.invoke('templates:delete', id),

  // Funciones especiales de plantillas
  searchTemplates: (searchTerm) => ipcRenderer.invoke('templates:search', searchTerm),

  // Ordenes
  getAllOrders: () => ipcRenderer.invoke('orders:getAll'),
  getPendingOrdersForLogbook: () => ipcRenderer.invoke('orders:getPendingForLogbook'),
  getOrderById: (id) => ipcRenderer.invoke('orders:getById', id),
  getOrdersByClientId: (clientId) => ipcRenderer.invoke('orders:getByClientId', clientId),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),
  recalculateOrderTotal: (orderId) => ipcRenderer.invoke('orders:recalculateTotal', orderId),
  getSales: () => ipcRenderer.invoke('sales:getAll'),
  getSalesPaginated: (page, limit, searchTerm) => ipcRenderer.invoke('sales:getPaginated', page, limit, searchTerm),
  searchSales: (page, limit, searchTerm) => ipcRenderer.invoke('sales:search', page, limit, searchTerm),
  getOrderProducts: (orderId) => ipcRenderer.invoke('orders:getProducts', orderId),

  // Pagos
  getAllPayments: () => ipcRenderer.invoke('payments:getAll'),
  getPaymentsByOrderId: (orderId) => ipcRenderer.invoke('payments:getPaymentsByOrderId', orderId),
  getPaymentById: (id) => ipcRenderer.invoke('payments:getById', id),
  createPayment: (data) => ipcRenderer.invoke('payments:create', data),
  updatePayment: (id, data) => ipcRenderer.invoke('payments:update', id, data),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id),
  getPaymentsByClientId: (clientId) => ipcRenderer.invoke('payments:getByClientId', clientId),

  // Presupuestos
  getAllBudgets: () => ipcRenderer.invoke('budgets:getAll'),
  getBudgetsPaginated: (page, limit, searchTerm) => ipcRenderer.invoke('budgets:getPaginated', page, limit, searchTerm),
  searchBudgets: (page, limit, searchTerm) => ipcRenderer.invoke('budgets:search', page, limit, searchTerm),
  getBudgetById: (id) => ipcRenderer.invoke('budgets:getById', id),
  getBudgetByClientId: (clientId) => ipcRenderer.invoke('budgets:getByClientId', clientId),
  createBudget: (data) => ipcRenderer.invoke('budgets:create', data),
  updateBudget: (id, data) => ipcRenderer.invoke('budgets:update', id, data),
  deleteBudget: (id) => ipcRenderer.invoke('budgets:delete', id),
  getBudgetProducts: (budgetId) => ipcRenderer.invoke('budgets:getProducts', budgetId),
  recalculateBudgetTotal: (budgetId) => ipcRenderer.invoke('budgets:recalculateTotal', budgetId),
  transformToOrder: (budgetId, userId) => ipcRenderer.invoke('budgets:transformToOrder', budgetId, userId),
  getBudgetNextId: () => ipcRenderer.invoke('budgets:getNextId'),

  // Stats
  getSalesStats: (params) => ipcRenderer.invoke('stats:getSales', params),
  getStatsProducts: () => ipcRenderer.invoke('stats:getProducts'),
  getAvailableYears: () => ipcRenderer.invoke('stats:getYears'),
  getAvailableWeeks: (year) => ipcRenderer.invoke('stats:getWeeks', year),

  // Ordenes rapidas (Simple Orders)
  getAllSimpleOrders: () => ipcRenderer.invoke('simpleOrders:getAll'),
  getSimpleOrderById: (id) => ipcRenderer.invoke('simpleOrders:getById', id),
  createSimpleOrder: (data) => ipcRenderer.invoke('simpleOrders:create', data),
  updateSimpleOrder: (id, data) => ipcRenderer.invoke('simpleOrders:update', id, data),
  deleteSimpleOrder: (id) => ipcRenderer.invoke('simpleOrders:delete', id),
  addSimpleOrderPayment: (data) => ipcRenderer.invoke('simpleOrders:addPayment', data),
  getSimpleOrderPayments: (id) => ipcRenderer.invoke('simpleOrders:getPayments', id),
  updateSimpleOrderPayment: (id, data) => ipcRenderer.invoke('simpleOrders:updatePayment', id, data),
  deleteSimpleOrderPayment: (id) => ipcRenderer.invoke('simpleOrders:deletePayment', id),
});