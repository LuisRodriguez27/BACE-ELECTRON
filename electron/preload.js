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

  // Productos
  getAllProducts: () => ipcRenderer.invoke('products:getAll'),
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  getActiveProducts: () => ipcRenderer.invoke('products:getActive'),
  getInactiveProducts: () => ipcRenderer.invoke('products:getInactive'),
  getProductsByCategory: (category) => ipcRenderer.invoke('products:getByCategory', category),
  getProductCategories: () => ipcRenderer.invoke('products:getCategories'),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  removeProduct: (id) => ipcRenderer.invoke('products:remove', id),

  // Funciones avanzadas de productos
  getProductWithTemplates: (productId) => ipcRenderer.invoke('products:getWithTemplates', productId),
  getProductUsageStats: (productId) => ipcRenderer.invoke('products:getUsageStats', productId),
  searchProducts: (searchTerm) => ipcRenderer.invoke('products:search', searchTerm),
  getMostUsedProducts: (limit) => ipcRenderer.invoke('products:getMostUsed', limit),
  getProductsWithFavoriteTemplates: () => ipcRenderer.invoke('products:getWithFavoriteTemplates'),

  // Plantillas de productos
  getAllTemplates: () => ipcRenderer.invoke('templates:getAll'),
  getTemplateById: (id) => ipcRenderer.invoke('templates:getById', id),
  getTemplatesByProductId: (productId) => ipcRenderer.invoke('templates:getByProductId', productId),
  getTemplatesByUserId: (userId) => ipcRenderer.invoke('templates:getByUserId', userId),
  getFavoriteTemplates: () => ipcRenderer.invoke('templates:getFavorites'),
  createTemplate: (data) => ipcRenderer.invoke('templates:create', data),
  updateTemplate: (id, data) => ipcRenderer.invoke('templates:update', id, data),
  deleteTemplate: (id) => ipcRenderer.invoke('templates:delete', id),
  toggleFavoriteTemplate: (id) => ipcRenderer.invoke('templates:toggleFavorite', id),

  // Funciones especiales de plantillas
  createTemplateFromModification: (data) => ipcRenderer.invoke('templates:createFromModification', data),
  findSimilarTemplates: (productId, width, height, tolerance) => ipcRenderer.invoke('templates:findSimilar', productId, width, height, tolerance),
  getTemplateUsageStats: () => ipcRenderer.invoke('templates:getUsageStats'),
  cloneTemplate: (templateId, createdBy, newTemplateName, newDescription) => ipcRenderer.invoke('templates:clone', templateId, createdBy, newTemplateName, newDescription),
  searchTemplates: (searchTerm) => ipcRenderer.invoke('templates:search', searchTerm),
  getTemplatesByCategory: (category) => ipcRenderer.invoke('templates:getByCategory', category),
  getMostUsedTemplates: (limit) => ipcRenderer.invoke('templates:getMostUsed', limit),
  calculateTemplatePrice: (templateId, quantity) => ipcRenderer.invoke('templates:calculatePrice', templateId, quantity),

  // Ordenes
  getAllOrders: () => ipcRenderer.invoke('orders:getAll'),
  getOrderById: (id) => ipcRenderer.invoke('orders:getById', id),
  getOrdersByClientId: (clientId) => ipcRenderer.invoke('orders:getByClientId', clientId),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),
  recalculateOrderTotal: (orderId) => ipcRenderer.invoke('orders:recalculateTotal', orderId),
  
  // Funciones del nuevo flujo de productos en órdenes
  addProductToOrder: (data) => ipcRenderer.invoke('orders:addProduct', data),
  addProductWithModifications: (data) => ipcRenderer.invoke('orders:addProductWithModifications', data),
  addProductFromTemplate: (data) => ipcRenderer.invoke('orders:addProductFromTemplate', data),
  addProductFromTemplateWithModifications: (data) => ipcRenderer.invoke('orders:addProductFromTemplateWithModifications', data),
  
  // Funciones de gestión de productos en orden
  updateProductQuantity: (data) => ipcRenderer.invoke('orders:updateProductQuantity', data),
  updateProductTemplate: (data) => ipcRenderer.invoke('orders:updateProductTemplate', data),
  updateProductCustomSpecs: (data) => ipcRenderer.invoke('orders:updateProductCustomSpecs', data),
  removeProductFromOrder: (orderProductId) => ipcRenderer.invoke('orders:removeProduct', orderProductId),
  clearProductsFromOrder: (orderId) => ipcRenderer.invoke('orders:clearProducts', orderId),
  getProductsFromOrder: (orderId) => ipcRenderer.invoke('orders:getProducts', orderId),
  
  // Funciones de consulta y estadísticas
  getOrdersUsingTemplate: (templateId) => ipcRenderer.invoke('orders:getOrdersUsingTemplate', templateId),
  getTemplateUsageInOrders: () => ipcRenderer.invoke('orders:getTemplateUsageInOrders'),
  getOrderStatistics: () => ipcRenderer.invoke('orders:getStatistics'),

  getSales: () => ipcRenderer.invoke('sales:getAll'),

  // Pagos
  getPaymentsByOrderId: (orderId) => ipcRenderer.invoke('payments:getPaymentsByOrderId', orderId),
  getPaymentById: (id) => ipcRenderer.invoke('payments:getById', id),
  createPayment: (data) => ipcRenderer.invoke('payments:create', data),
  updatePayment: (id, data) => ipcRenderer.invoke('payments:update', id, data),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id),
});