const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Deshabilitar aceleración de hardware para evitar problemas de renderizado
app.disableHardwareAcceleration();

// Importar funciones de servicios
const userService = require('./services/userService');
const permissionService = require('./services/permissionService');
const clientService = require('./services/clientService');
const productService = require('./services/productService');
const productTemplatesService = require('./services/productTemplateService');
const orderService = require('./services/orderService');
const paymentService = require('./services/paymentsService');
const authService = require('./services/authService');
const budgetService = require('./services/budgetService');

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

  // Cargar la aplicación según el entorno
  if (app.isPackaged) {
    // Producción: cargar desde los archivos empaquetados
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  } else {
    // Desarrollo: cargar desde el servidor de Vite
    win.loadURL('http://localhost:5173');
  }
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
ipcMain.handle('auth:login', async (event, { username, password }) => await authService.login(username, password));
ipcMain.handle('auth:logout', async () => await authService.logout());
ipcMain.handle('auth:getCurrentUser', async () => await authService.getCurrentUser());
ipcMain.handle('auth:isAuthenticated', async () => await authService.isAuthenticated());
ipcMain.handle('auth:getUserWithPermissions', async () => await authService.getUserWithPermissions());
// Middleware para verificar autenticación
ipcMain.handle('auth:requireAuth', async (event, operation) => await authService.requireAuth());

// Manejo de eventos IPC para permisos
ipcMain.handle('permissions:getAll', async () => await permissionService.getAllPermissions());
ipcMain.handle('permissions:getById', async (event, id) => await permissionService.getPermissionById(id));
ipcMain.handle('permissions:getByUserId', async (event, userId) => await permissionService.getPermissionsByUserId(userId));
ipcMain.handle('permissions:create', async (event, data) => await permissionService.createPermission(data));
ipcMain.handle('permissions:update', async (event, id, data) => await permissionService.updatePermission(id, data));
ipcMain.handle('permissions:delete', async (event, id) => await permissionService.deletePermission(id));
ipcMain.handle('permissions:assignToUser', async (event, data) => await permissionService.assignPermissionToUser(data));
ipcMain.handle('permissions:removeFromUser', async (event, data) => await permissionService.removePermissionFromUser(data));

// Manejo de eventos IPC para clientes
ipcMain.handle('clients:getAll', async () => await clientService.getAllClients());
ipcMain.handle('clients:getById', async (event, id) => await clientService.getClientById(id));
ipcMain.handle('clients:create', async (event, data) => await clientService.createClient(data));
ipcMain.handle('clients:update', async (event, id, data) => await clientService.updateClient(id, data));
ipcMain.handle('clients:delete', async (event, id) => await clientService.deleteClient(id));
ipcMain.handle('clients:search', async (event, searchTerm) => await clientService.searchClients(searchTerm));

// Manejo de eventos IPC para productos
ipcMain.handle('products:getAll', async () => await productService.getAllProducts());
ipcMain.handle('products:getById', async (event, id) => await productService.getProductById(id));
ipcMain.handle('products:create', async (event, data) => await productService.createProduct(data));
ipcMain.handle('products:update', async (event, id, data) => await productService.updateProduct(id, data));
ipcMain.handle('products:delete', async (event, id) => await productService.deleteProduct(id));

// Funciones avanzadas de productos
ipcMain.handle('products:getWithTemplates', async (event, productId) => await productService.getProductWithTemplates(productId));
ipcMain.handle('products:getAllWithTemplates', async () => await productService.getAllProductsWithTemplates());
ipcMain.handle('products:search', async (event, searchTerm) => await productService.searchProducts(searchTerm));

// Manejo de eventos IPC para plantillas de productos
ipcMain.handle('templates:getAll', async () => await productTemplatesService.getAllTemplates());
ipcMain.handle('templates:getById', async (event, id) => await productTemplatesService.getTemplateById(id));
ipcMain.handle('templates:getByProductId', async (event, productId) => await productTemplatesService.getTemplatesByProductId(productId));
ipcMain.handle('templates:create', async (event, data) => await productTemplatesService.createTemplate(data));
ipcMain.handle('templates:update', async (event, id, data) => await productTemplatesService.updateTemplate(id, data));
ipcMain.handle('templates:delete', async (event, id) => await productTemplatesService.deleteTemplate(id));

// Funciones especiales de plantillas
ipcMain.handle('templates:search', async (event, searchTerm) => await productTemplatesService.searchTemplates(searchTerm));

// Manejo de eventos IPC para ordenes
ipcMain.handle('orders:getAll', async () => await orderService.getAllOrders());
ipcMain.handle('orders:getById', async (event, id) => await orderService.getOrderById(id));
ipcMain.handle('orders:getByClientId', async (event, clientId) => await orderService.getOrdersByClientId(clientId));
ipcMain.handle('orders:create', async (event, data) => await orderService.createOrder(data));
ipcMain.handle('orders:update', async (event, id, data) => await orderService.updateOrder(id, data));
ipcMain.handle('orders:delete', async (event, id) => await orderService.deleteOrder(id));
ipcMain.handle('orders:recalculateTotal', async (event, orderId) => await orderService.recalculateOrderTotal(orderId));
ipcMain.handle('sales:getAll', async () => await orderService.getSales());
ipcMain.handle('sales:getPaginated', async (event, page, limit, searchTerm) => await orderService.getSalesPaginated(page, limit, searchTerm));
ipcMain.handle('sales:search', async (event, page, limit, searchTerm) => await orderService.getSalesPaginated(page, limit, searchTerm));
ipcMain.handle('orders:getProducts', async (event, orderId) => await orderService.getOrderProducts(orderId));

// Manejo de eventos IPC para pagos
ipcMain.handle('payments:getAll', async () => await paymentService.getAllPayments());
ipcMain.handle('payments:getPaymentsByOrderId', async (event, orderId) => await paymentService.getPaymentsByOrderId(orderId));
ipcMain.handle('payments:getById', async (event, id) => await paymentService.getPaymentById(id));
ipcMain.handle('payments:create', async (event, data) => await paymentService.createPayment(data));
ipcMain.handle('payments:update', async (event, id, data) => await paymentService.updatePayment(id, data));
ipcMain.handle('payments:delete', async (event, id) => await paymentService.deletePayment(id));
ipcMain.handle('payments:getByClientId', async (event, clientId) => await paymentService.getPaymentsByClientId(clientId));

// Manejo de eventos IPC para presupuestos
ipcMain.handle('budgets:getAll', async () => await budgetService.getAllBudgets());
ipcMain.handle('budgets:getPaginated', async (event, page, limit, searchTerm) => await budgetService.getBudgetsPaginated(page, limit, searchTerm));
ipcMain.handle('budgets:search', async (event, page, limit, searchTerm) => await budgetService.getBudgetsPaginated(page, limit, searchTerm));
ipcMain.handle('budgets:getById', async (event, id) => await budgetService.getBudgetById(id));
ipcMain.handle('budgets:getByClientId', async (event, clientId) => await budgetService.getBudgetByClientId(clientId));
ipcMain.handle('budgets:create', async (event, data) => await budgetService.createBudget(data));
ipcMain.handle('budgets:delete', async (event, id) => await budgetService.deleteBudget(id));
ipcMain.handle('budgets:getProducts', async (event, budgetId) => await budgetService.getBudgetProducts(budgetId));
ipcMain.handle('budgets:recalculateTotal', async (event, budgetId) => await budgetService.recalculateBudgetTotal(budgetId));
ipcMain.handle('budgets:transformToOrder', async (event, budgetId, userId) => await budgetService.transformToOrder(budgetId, userId));
ipcMain.handle('budgets:getNextId', async () => await budgetService.getNextId());

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