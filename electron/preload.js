const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {

  // Usuarios
  getAllUsers: () => ipcRenderer.invoke('users:getAll'),
  getUserById: (id) => ipcRenderer.invoke('users:getById', id),
  createUser: (username, password) => ipcRenderer.invoke('users:create', username, password),
  updateUser: (id, username, password) => ipcRenderer.invoke('users:update', id, username, password),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),

  // Clientes
  getAllClients: () => ipcRenderer.invoke('clients:getAll'),  
  getClientById: (id) => ipcRenderer.invoke('clients:getById', id),
  createClient: (clientData) => ipcRenderer.invoke('clients:create', clientData),
  updateClient: (id, name, phone, address, description) => ipcRenderer.invoke('clients:update', id, name, phone, address, description),
  deleteClient: (id) => ipcRenderer.invoke('clients:delete', id),

  // Productos
  getAllProducts: () => ipcRenderer.invoke('products:getAll'),  
  getProductById: (id) => ipcRenderer.invoke('products:getById', id),
  createProduct: (name, serialNumber, price, description) => ipcRenderer.invoke('products:create', name, serialNumber, price, description),
  updateProduct: (id, name, serialNumber, price, description) => ipcRenderer.invoke('products:update', id, name, serialNumber, price, description),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),

  // Órdenes
  getAllOrders: () => ipcRenderer.invoke('orders:getAll'),
  getOrderById: (id) => ipcRenderer.invoke('orders:getById', id),
  createOrder: (clientId, userId, estimatedDeliveryDate, status, total) => ipcRenderer.invoke('orders:create', clientId, userId, estimatedDeliveryDate, status, total),
  updateOrder: (id, clientId, userId, estimatedDeliveryDate, status, total) => ipcRenderer.invoke('orders:update', id, clientId, userId, estimatedDeliveryDate, status, total),
  deleteOrder: (id) => ipcRenderer.invoke('orders:delete', id),

  addProductToOrder: (orderId, productId, quantity, price) => ipcRenderer.invoke('orders:addProduct', orderId, productId, quantity, price),
  getOrderProducts: (orderId) => ipcRenderer.invoke('orders:getProducts', orderId),
  updateOrderProduct: (id, orderId, productId, quantity) => ipcRenderer.invoke('orders:updateProduct', id, orderId, productId, quantity),
  deleteOrderProduct: (id) => ipcRenderer.invoke('orders:deleteProduct', id),

  // Pagos
  createPayment: (orderId, amount, description) => ipcRenderer.invoke('payments:create', orderId, amount, description),
  getPaymentsByOrderId: (orderId) => ipcRenderer.invoke('payments:getByOrderId', orderId),  
  updatePayment: (id, orderId, amount, description) => ipcRenderer.invoke('payments:update', id, orderId, amount, description),
  deletePayment: (id) => ipcRenderer.invoke('payments:delete', id)
  
});
