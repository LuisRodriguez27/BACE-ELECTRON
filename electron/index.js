const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Deshabilitar aceleración de hardware para evitar problemas de renderizado
app.disableHardwareAcceleration();

// Importar funciones de servicios
const userService = require('./services/userService');
const permissionService = require('./repositories/permissions');
const clientService = require('./repositories/clients');
const productService = require('./repositories/products');
const productTemplatesService = require('./repositories/productTemplates');
const orderService = require('./repositories/orders');
const paymentService = require('./repositories/payments');
const authService = require('./repositories/auth')

function createWindow() {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false, // No mostrar hasta que esté listo
    backgroundColor: '#ffffff', // Fondo blanco para evitar pantallas negras
    // autoHideMenuBar: true,
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
ipcMain.handle('users:getAll', async () => await userService.getAllUsers());
ipcMain.handle('users:getById', async (event, id) => await userService.getUserById(id));
ipcMain.handle('users:create', async (event, data) => await userService.createUser(data));
ipcMain.handle('users:update', async (event, id, data) => await userService.updateUser(id, data));
ipcMain.handle('users:delete', async (event, id) => await userService.deleteUser(id));
ipcMain.handle('users:verifyPassword', async (event, data) => await userService.verifyPassword(data));
ipcMain.handle('users:checkUsername', async (event, username, excludeUserId) => await userService.checkUsernameExists(username, excludeUserId));

// Manejo de eventos IPC para autenticacion
ipcMain.handle('auth:login', (event, { username, password }) => 
  authService.login(username, password)
);
ipcMain.handle('auth:logout', () => authService.logout());
ipcMain.handle('auth:getCurrentUser', () => authService.getCurrentUser());
ipcMain.handle('auth:isAuthenticated', () => authService.isAuthenticated());
ipcMain.handle('auth:getUserWithPermissions', () => 
  authService.getUserWithPermissions()
);
// Middleware para verificar autenticación
ipcMain.handle('auth:requireAuth', (event, operation) => {
  if (!authService.isAuthenticated()) {
    return { success: false, message: 'No autorizado' };
  }
  return { success: true };
});

// Manejo de eventos IPC para permisos
ipcMain.handle('permissions:getAll', () => permissionService.getAllPermissions());
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
ipcMain.handle('products:create', (event, data) => productService.createProduct(data));
ipcMain.handle('products:update', (event, id, data) => productService.updateProduct(id, data));
ipcMain.handle('products:delete', (event, id) => productService.deleteProduct(id));
ipcMain.handle('products:remove', (event, id) => productService.removeProduct(id));   // DEV

// Funciones avanzadas de productos
ipcMain.handle('products:getWithTemplates', (event, productId) => productService.getProductWithTemplates(productId));
ipcMain.handle('products:search', (event, searchTerm) => productService.searchProducts(searchTerm));

// Manejo de eventos IPC para plantillas de productos
ipcMain.handle('templates:getAll', () => productTemplatesService.getAllTemplates());
ipcMain.handle('templates:getById', (event, id) => productTemplatesService.getTemplateById(id));
ipcMain.handle('templates:getByProductId', (event, productId) => productTemplatesService.getTemplatesByProductId(productId));
ipcMain.handle('templates:create', (event, data) => productTemplatesService.createTemplate(data));
ipcMain.handle('templates:update', (event, id, data) => productTemplatesService.updateTemplate(id, data));
ipcMain.handle('templates:delete', (event, id) => productTemplatesService.deleteTemplate(id));

// Funciones especiales de plantillas
ipcMain.handle('templates:search', (event, searchTerm) => productTemplatesService.searchTemplates(searchTerm));

// Manejo de eventos IPC para ordenes
ipcMain.handle('orders:getAll', () => orderService.getAllOrders());
ipcMain.handle('orders:getById', (event, id) => orderService.getOrderById(id));
ipcMain.handle('orders:getByClientId', (event, clientId) => orderService.getOrdersByClientId(clientId));
ipcMain.handle('orders:create', (event, data) => orderService.createOrder(data));
ipcMain.handle('orders:update', (event, id, data) => orderService.updateOrder(id, data));
ipcMain.handle('orders:delete', (event, id) => orderService.deleteOrder(id));
ipcMain.handle('orders:recalculateTotal', (event, orderId) => orderService.recalculateOrderTotal(orderId));
ipcMain.handle('sales:getAll', () => orderService.getSales());

// Manejo de eventos IPC para pagos
ipcMain.handle('payments:getPaymentsByOrderId', (event, orderId) => paymentService.getPaymentsByOrderId(orderId));
ipcMain.handle('payments:getById', (event, id) => paymentService.getPaymentById(id));
ipcMain.handle('payments:create', (event, data) => paymentService.createPayment(data));
ipcMain.handle('payments:update', (event, id, data) => paymentService.updatePayment(id, data));
ipcMain.handle('payments:delete', (event, id) => paymentService.deletePayment(id));



app.whenReady().then(createWindow);

// Limpiar sesión al cerrar la aplicación
app.on('before-quit', () => {
  authService.logout();
});

app.on('window-all-closed', () => {
  // Limpiar sesión antes de cerrar
  authService.logout();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});