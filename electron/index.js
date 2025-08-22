const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Deshabilitar aceleración de hardware para evitar problemas de renderizado
app.disableHardwareAcceleration();

// Importar funciones de servicios
const userService = require('./services/users');
const permissionService = require('./services/permissions');
const clientService = require('./services/clients');
const productService = require('./services/products');
const orderService = require('./services/orders');
const paymentService = require('./services/payments');

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false, // No mostrar hasta que esté listo
    backgroundColor: '#ffffff', // Fondo blanco para evitar pantallas negras
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false // Solo para desarrollo
    },
  });

  // Mostrar ventana cuando esté lista para evitar flashes
  win.once('ready-to-show', () => {
    win.show();
    win.maximize(); // Maximizar después de mostrar
  });

  win.loadURL('http://localhost:5173'); // Durante el desarrollo
  // win.loadFile('dist/index.html'); // Para producción
}

// Manejo de eventos IPC para usuarios
ipcMain.handle('users:getAll', () => userService.getAllUsers());
ipcMain.handle('users:getById', (event, id) => userService.getUserById(id));
ipcMain.handle('users:create', (event, data) => userService.createUser(data));
ipcMain.handle('users:update', (event, data) => userService.updateUser(data));
ipcMain.handle('users:delete', (event, id) => userService.deleteUser(id));
ipcMain.handle('users:verifyPassword', (event, data) => userService.verifyPassword(data));

// Manejo de eventos IPC para permisos
ipcMain.handle('permissions:getAll', () => permissionService.getAllUsers());
ipcMain.handle('permissions:getById', (event, id) => permissionService.getPermissionsById(id));
ipcMain.handle('permissions:getByUserId', (event, userId) => permissionService.getPermissionsByUserId(userId));
ipcMain.handle('permissions:create', (event, data) => permissionService.createPermission(data));
ipcMain.handle('permissions:update', (event, id, data) => permissionService.updatePermission(id, data));
ipcMain.handle('permissions:delete', (event, id) => permissionService.deletePermission(id));
ipcMain.handle('permissions:assignToUser', (event, data) => permissionService.assignPermissionToUser(data));
ipcMain.handle('permissions:removeFromUser', (event, data) => permissionService.removePermissionFromUser(data));

// Manejo de eventos IPC para clientes
ipcMain.handle('clients:getAll', () => clientService.getAllClients());
ipcMain.handle('clients:getById', (event, id) => clientService.getClientById(id));
ipcMain.handle('clients:create', (event, data) => clientService.createClient(data));
ipcMain.handle('clients:update', (event, id, data) => clientService.updateClient(id, data));
ipcMain.handle('clients:delete', (event, id) => clientService.deleteClient(id));      // DEV

// Manejo de eventos IPC para productos
ipcMain.handle('products:getAll', () => productService.getAllProducts());
ipcMain.handle('products:getById', (event, id) => productService.getProductById(id));
ipcMain.handle('products:getActive', () => productService.getActiveProducts());
ipcMain.handle('products:getInactive', () => productService.getInactiveProducts());
ipcMain.handle('products:create', (event, data) => productService.createProduct(data));
ipcMain.handle('products:update', (event, id, data) => productService.updateProduct(id, data));
ipcMain.handle('products:delete', (event, id) => productService.deleteProduct(id));
ipcMain.handle('products:remove', (event, id) => productService.removeProduct(id));   // DEV

// Manejo de eventos IPC para ordenes
ipcMain.handle('orders:getAll', () => orderService.getAllOrders());
ipcMain.handle('orders:getById', (event, id) => orderService.getOrderById(id));
ipcMain.handle('orders:getByClientId', (event, clientId) => orderService.getOrdersByClientId(clientId));
ipcMain.handle('orders:create', (event, data) => orderService.createOrder(data));
ipcMain.handle('orders:update', (event, id, data) => orderService.updateOrder(id, data));
ipcMain.handle('orders:delete', (event, id) => orderService.deleteOrder(id));
ipcMain.handle('orders:addProduct', (event, data) => orderService.addProductToOrder(data));
ipcMain.handle('orders:addProducts', (event, data) => orderService.addProductsToOrder(data));
ipcMain.handle('orders:updateProductQuantity', (event, data) => orderService.updateProductQuantity(data));
ipcMain.handle('orders:updateProductInOrder', (event, data) => orderService.updateProductInOrder(data));
ipcMain.handle('orders:removeProduct', (event, orderProductId) => orderService.removeProductFromOrder(orderProductId));
ipcMain.handle('orders:clearProducts', (event, orderId) => orderService.clearProductsFromOrder(orderId));
ipcMain.handle('orders:getProducts', (event, orderId) => orderService.getProductsToOrder(orderId));

// Manejo de eventos IPC para pagos
ipcMain.handle('payments:getPaymetsByOrderId', (event, orderId) => paymentService.getPaymentsByOrderId(orderId));
ipcMain.handle('payments:getById', (event, id) => paymentService.getPaymentById(id));
ipcMain.handle('payments:create', (event, data) => paymentService.createPayment(data));
ipcMain.handle('payments:update', (event, id, data) => paymentService.updatePayment(id, data));
ipcMain.handle('payments:delete', (event, id) => paymentService.deletePayment(id));



app.whenReady().then(createWindow);