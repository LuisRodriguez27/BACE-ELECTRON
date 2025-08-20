const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const db = require('./db');

// Importar funciones de servicios
const userService = require('./services/users');
const clientService = require('./services/clients');
const productService = require('./services/products');
const orderService = require('./services/orders');
const paymentService = require('./services/payments');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },
  });

  win.loadURL('http://localhost:5173'); // Durante el desarrollo
  // win.loadFile('dist/index.html'); // Para producción

}

// Manejo de eventos IPC para usuarios
ipcMain.handle('users:getAll', () => userService.getAllUsers());
ipcMain.handle('users:getById', (event, id) => userService.getUserById(id));
ipcMain.handle('users:create', (event, username, password) => userService.createUser(username, password));
ipcMain.handle('users:update', (event, id, username, password) => userService.updateUser(id, username, password));
ipcMain.handle('users:delete', (event, id) => userService.deleteUser(id));

// Manejo de eventos IPC para clientes
ipcMain.handle('clients:getAll', () => clientService.getAllClients());
ipcMain.handle('clients:getById', (event, id) => clientService.getClientById(id));
ipcMain.handle('clients:create', (event, clientData) => clientService.createClient(clientData));
ipcMain.handle('clients:update', (event, id, name, phone, address, description) => clientService.updateClient(id, name, phone, address, description));
ipcMain.handle('clients:delete', (event, id) => clientService.deleteClient(id));

// Manejo de eventos IPC para productos
ipcMain.handle('products:getAll', () => productService.getAllProducts()); 
ipcMain.handle('products:getById', (event, id) => productService.getProductById(id));
ipcMain.handle('products:create', (event, name, serialNumber, price, description) => productService.createProduct(name, serialNumber, price, description));
ipcMain.handle('products:update', (event, id, name, serialNumber, price, description) => productService.updateProduct(id, name, serialNumber, price, description));
ipcMain.handle('products:delete', (event, id) => productService.deleteProduct(id));

// Manejo de eventos IPC para órdenes
ipcMain.handle('orders:getAll', () => orderService.getAllOrders());
ipcMain.handle('orders:getById', (event, id) => orderService.getOrderById(id));
ipcMain.handle('orders:create', (event, clientId, userId, estimatedDeliveryDate, status, total) => orderService.createOrder(clientId, userId, estimatedDeliveryDate, status, total));
ipcMain.handle('orders:update', (event, id, clientId, userId, estimatedDeliveryDate, status, total) => orderService.updateOrder(id, clientId, userId, estimatedDeliveryDate, status, total));
ipcMain.handle('orders:delete', (event, id) => orderService.deleteOrder(id));

ipcMain.handle('orders:addProduct', (event, orderId, productId, quantity, price) => orderService.addProductToOrder(orderId, productId, quantity, price));
ipcMain.handle('orders:getProducts', (event, orderId) => orderService.getOrderProducts(orderId));
ipcMain.handle('orders:updateProduct', (event, id, orderId, productId, quantity) => orderService.updateOrderProduct(id, orderId, productId, quantity));
ipcMain.handle('orders:deleteProduct', (event, id) => orderService.deleteOrderProduct(id));

// Manejo de eventos IPC para pagos
ipcMain.handle('payments:create', (event, orderId, amount, description) => paymentService.createPayment(orderId, amount, description));
ipcMain.handle('payments:getByOrderId', (event, orderId) => paymentService.getPaymentsByOrderId(orderId));
ipcMain.handle('payments:update', (event, id, orderId, amount, description) => paymentService.updatePayment(id, orderId, amount, description));
ipcMain.handle('payments:delete', (event, id) => paymentService.deletePayment(id)); 

app.whenReady().then(createWindow);