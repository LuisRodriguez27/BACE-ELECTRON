const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Usuarios
  getAllUsers: () => ipcRenderer.invoke('users:getAll'),
  getUserById: (id) => ipcRenderer.invoke('users:getById', id),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (id, data) => ipcRenderer.invoke('users:update', id, data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  verifyPassword: (data) => ipcRenderer.invoke('users:verifyPassword', data),

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
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (id, data) => ipcRenderer.invoke('products:update', id, data),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  removeProduct: (id) => ipcRenderer.invoke('products:remove', id),

  // Ordenes
  getAllOrders: () => ipcRenderer.invoke('orders:getAll'),
  getOrderById: (id) => ipcRenderer.invoke('orders:getById', id),
  getOrdersByClientId: (clientId) => ipcRenderer.invoke('orders:getByClientId', clientId),
  createOrder: (data) => ipcRenderer.invoke('orders:create', data),
  updateOrder: (id, data) => ipcRenderer.invoke('orders:update', id, data),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),
  addProductToOrder: (orderId, data) => ipcRenderer.invoke('orders:addProduct', orderId, data),
  addProductsToOrder: (orderId, data) => ipcRenderer.invoke('orders:addProducts', orderId, data),
  updateProductQuantity: (orderProductId, quantity) => ipcRenderer.invoke('orders:updateProductQuantity', orderProductId, quantity),
  updateProductInOrder: (orderProductId, data) => ipcRenderer.invoke('orders:updateProductInOrder', orderProductId, data),
  removeProduct: (orderProductId) => ipcRenderer.invoke('orders:removeProduct', orderProductId),
  clearProducts: (orderId) => ipcRenderer.invoke('orders:clearProducts', orderId),
  getProducts: (orderId) => ipcRenderer.invoke('orders:getProducts', orderId),

  getSales: () => ipcRenderer.invoke('sales:getAll'),

  // Pagos
  getPaymentsByOrderId: (orderId) => ipcRenderer.invoke('payments:getPaymentsByOrderId', orderId),
  getPaymentById: (id) => ipcRenderer.invoke('payments:getById', id),
  createPayment: (data) => ipcRenderer.invoke('payments:create', data),
  updatePayment: (id, data) => ipcRenderer.invoke('payments:update', id, data),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id),
});
