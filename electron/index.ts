import { app, BrowserWindow, ipcMain, protocol, net, shell, Menu, clipboard } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import * as log from 'electron-log';
import * as http from 'http';
import 'dotenv/config';

import { initDb } from './db';
import userService from './services/userService';
import permissionService from './services/permissionService';
import clientService from './services/clientService';
import productService from './services/productService';
import productTemplatesService from './services/productTemplateService';
import orderService from './services/orderService';
import paymentService from './services/paymentsService';
import authService from './services/authService';
import budgetService from './services/budgetService';
import statsService from './services/statsService';
import simpleOrderService from './services/simpleOrderService';
import cashSessionService from './services/cashSessionService';
import expensesService from './services/expensesService';
import imageService from './services/imageService';
import supplierService from './services/supplierService';
import supplierOrderService from './services/supplierOrderService';
import printLogService from './services/printLogService';

// ── Tipos IPC — organizados por agregado ─────────────────────────────────────
import type { CreateUserData, UpdateUserData, VerifyPasswordData } from './types/user';
import type { CreatePermissionData, UpdatePermissionData, AssignPermissionData } from './types/permission';
import type { ClientData } from './types/client';
import type { ProductData } from './types/product';
import type { TemplateData } from './types/productTemplate';
import type { OrderItem, OrderData } from './types/order';
import type { CreatePaymentData, UpdatePaymentData } from './types/payment';
import type { BudgetData } from './types/budget';
import type { SalesStatsParams } from './types/stats';
import type { SimpleOrderData, AddSimplePaymentData } from './types/simpleOrder';
import type { OpenSessionData, CloseSessionData } from './types/cashSession';
import type { CreateExpenseData, UpdateExpenseData } from './types/expense';
import type { SupplierData } from './types/supplier';
import type { SupplierOrderData } from './types/supplierOrder';
import type { PrintLogData, PrintLogCheckboxData } from './types/printLog';

autoUpdater.logger = log;
(autoUpdater.logger as typeof log).transports.file.level = 'info';

app.disableHardwareAcceleration();

let whatsappWindow: BrowserWindow | null = null;
let isQuitting: boolean = false;
let downloadedUpdatePath: string | null = null;

const WHATSAPP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function initWhatsApp(): void {
  if (whatsappWindow) return;

  whatsappWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false,
    title: 'WhatsApp Web',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  whatsappWindow.webContents.on('context-menu', (_event, params) => {
    const template: Electron.MenuItemConstructorOptions[] = [];

    if (params.mediaType === 'image') {
      template.push(
        {
          label: 'Guardar imagen como...',
          click: () => { whatsappWindow?.webContents.downloadURL(params.srcURL); }
        },
        {
          label: 'Copiar imagen',
          click: () => { whatsappWindow?.webContents.copyImageAt(params.x, params.y); }
        },
        { type: 'separator' }
      );
    }

    if (params.linkURL) {
      template.push(
        {
          label: 'Copiar enlace',
          click: () => { clipboard.writeText(params.linkURL); }
        },
        { type: 'separator' }
      );
    }

    if (params.selectionText) {
      template.push(
        { label: 'Copiar', role: 'copy' },
        { type: 'separator' }
      );
    }

    if (params.isEditable) {
      template.push(
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Pegar y coincidir el estilo', role: 'pasteAndMatchStyle' },
        { label: 'Seleccionar todo', role: 'selectAll' },
        { type: 'separator' }
      );
    }

    if (template.length > 0) {
      // Eliminar el separador si es el último elemento
      if (template[template.length - 1].type === 'separator') {
        template.pop();
      }
      const menu = Menu.buildFromTemplate(template);
      menu.popup({ window: whatsappWindow as BrowserWindow });
    }
  });

  // Manejar descargas para que salga el diálogo nativo de "Guardar como..."
  whatsappWindow.webContents.session.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({
      title: 'Guardar archivo...',
      defaultPath: item.getFilename(),
      buttonLabel: 'Guardar'
    });
  });

  // Ocultar al intentar cerrar en lugar de destruir la ventana
  whatsappWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      whatsappWindow?.hide();
    }
  });

  // Pre-cargar WhatsApp con un userAgent limpio (sin "Electron")
  whatsappWindow.loadURL('https://web.whatsapp.com', { userAgent: WHATSAPP_USER_AGENT });
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
    show: false,
    backgroundColor: '#ffffff',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    },
  });

  win.once('ready-to-show', () => {
    win.show();
    win.maximize();
  });

  win.on('closed', () => { app.quit(); });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  } else {
    const loadDevServer = () => {
      http.get('http://localhost:5173', () => {
        win.loadURL('http://localhost:5173');
      }).on('error', () => {
        console.log('Esperando a que inicialice el servidor de Vite en el puerto 5173...');
        setTimeout(loadDevServer, 1000);
      });
    };
    loadDevServer();
  }
}

// Handlers IPC — Usuarios
ipcMain.handle('users:getAll', async () => await userService.getAllUsers());
ipcMain.handle('users:getById', async (_event, id: number) => await userService.getUserById(id));
ipcMain.handle('users:create', async (_event, data: CreateUserData) => await userService.createUser(data));
ipcMain.handle('users:update', async (_event, id: number, data: UpdateUserData) => await userService.updateUser(id, data));
ipcMain.handle('users:delete', async (_event, id: number) => await userService.deleteUser(id));
ipcMain.handle('users:verifyPassword', async (_event, data: VerifyPasswordData) => await userService.verifyPassword(data));
ipcMain.handle('users:checkUsername', async (_event, username: string, excludeUserId?: number) =>
  await userService.checkUsernameExists(username, excludeUserId));

// Handlers IPC — Autenticación
ipcMain.handle('auth:login', async (_event, { username, password }: { username: string; password: string }) =>
  await authService.login(username, password));
ipcMain.handle('auth:logout', async () => await authService.logout());
ipcMain.handle('auth:getCurrentUser', async () => await authService.getCurrentUser());
ipcMain.handle('auth:isAuthenticated', async () => await authService.isAuthenticated());
ipcMain.handle('auth:getUserWithPermissions', async () => await authService.getUserWithPermissions());
ipcMain.handle('auth:requireAuth', async () => await authService.requireAuth());

// Handlers IPC — Permisos
ipcMain.handle('permissions:getAll', async () => await permissionService.getAllPermissions());
ipcMain.handle('permissions:getById', async (_event, id: number) => await permissionService.getPermissionById(id));
ipcMain.handle('permissions:getByUserId', async (_event, userId: number) => await permissionService.getPermissionsByUserId(userId));
ipcMain.handle('permissions:create', async (_event, data: CreatePermissionData) => await permissionService.createPermission(data));
ipcMain.handle('permissions:update', async (_event, id: number, data: UpdatePermissionData) => await permissionService.updatePermission(id, data));
ipcMain.handle('permissions:delete', async (_event, id: number) => await permissionService.deletePermission(id));
ipcMain.handle('permissions:assignToUser', async (_event, data: AssignPermissionData) => await permissionService.assignPermissionToUser(data));
ipcMain.handle('permissions:removeFromUser', async (_event, data: AssignPermissionData) => await permissionService.removePermissionFromUser(data));

// Handlers IPC — Clientes
ipcMain.handle('clients:getAll', async () => await clientService.getAllClients());
ipcMain.handle('clients:getAllInvested', async () => await clientService.getAllInvestedClients());
ipcMain.handle('clients:getById', async (_event, id: number) => await clientService.getClientById(id));
ipcMain.handle('clients:create', async (_event, data: ClientData) => await clientService.createClient(data));
ipcMain.handle('clients:update', async (_event, id: number, data: ClientData) => await clientService.updateClient(id, data));
ipcMain.handle('clients:delete', async (_event, id: number) => await clientService.deleteClient(id));
ipcMain.handle('clients:search', async (_event, searchTerm: string) => await clientService.searchClients(searchTerm));
ipcMain.handle('clients:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await clientService.getClientsPaginated(page, limit, searchTerm));

// Handlers IPC — Productos
ipcMain.handle('products:getAll', async () => await productService.getAllProducts());
ipcMain.handle('products:getById', async (_event, id: number) => await productService.getProductById(id));
ipcMain.handle('products:create', async (_event, data: ProductData) => await productService.createProduct(data));
ipcMain.handle('products:update', async (_event, id: number, data: ProductData) => await productService.updateProduct(id, data));
ipcMain.handle('products:delete', async (_event, id: number) => await productService.deleteProduct(id));
ipcMain.handle('products:getWithTemplates', async (_event, productId: number) => await productService.getProductWithTemplates(productId));
ipcMain.handle('products:getAllWithTemplates', async () => await productService.getAllProductsWithTemplates());
ipcMain.handle('products:search', async (_event, searchTerm: string) => await productService.searchProducts(searchTerm));
ipcMain.handle('products:searchWithTemplates', async (_event, searchTerm: string) => await productService.searchProductsWithTemplates(searchTerm));
ipcMain.handle('products:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await productService.getProductsPaginated(page, limit, searchTerm));
ipcMain.handle('products:findSimilarNames', async () => await productService.getProductsWithSimilarNames());

// Handlers IPC — Plantillas de productos
ipcMain.handle('templates:getAll', async () => await productTemplatesService.getAllTemplates());
ipcMain.handle('templates:getById', async (_event, id: number) => await productTemplatesService.getTemplateById(id));
ipcMain.handle('templates:getByProductId', async (_event, productId: number) => await productTemplatesService.getTemplatesByProductId(productId));
ipcMain.handle('templates:create', async (_event, data: TemplateData) => await productTemplatesService.createTemplate(data));
ipcMain.handle('templates:update', async (_event, id: number, data: Omit<TemplateData, 'created_by'>) => await productTemplatesService.updateTemplate(id, data));
ipcMain.handle('templates:delete', async (_event, id: number) => await productTemplatesService.deleteTemplate(id));
ipcMain.handle('templates:search', async (_event, searchTerm: string) => await productTemplatesService.searchTemplates(searchTerm));
ipcMain.handle('templates:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await productTemplatesService.getTemplatesPaginated(page, limit, searchTerm));

// Handlers IPC — Órdenes
ipcMain.handle('orders:getAll', async () => await orderService.getAllOrders());
ipcMain.handle('orders:getPendingForLogbook', async () => await orderService.getPendingOrdersForLogbook());
ipcMain.handle('orders:getById', async (_event, id: number) => await orderService.getOrderById(id));
ipcMain.handle('orders:getByClientId', async (_event, clientId: number) => await orderService.getOrdersByClientId(clientId));
ipcMain.handle('orders:create', async (_event, data: OrderData) => await orderService.createOrder(data));
ipcMain.handle('orders:update', async (_event, id: number, data: OrderData) => await orderService.updateOrder(id, data));
ipcMain.handle('orders:delete', async (_event, id: number) => await orderService.deleteOrder(id));
ipcMain.handle('orders:recalculateTotal', async (_event, orderId: number) => await orderService.recalculateOrderTotal(orderId));
ipcMain.handle('sales:getAll', async () => await orderService.getSales());
ipcMain.handle('sales:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await orderService.getSalesPaginated(page, limit, searchTerm));
ipcMain.handle('sales:search', async (_event, page: number, limit: number, searchTerm: string) =>
  await orderService.getSalesPaginated(page, limit, searchTerm));
ipcMain.handle('orders:getProducts', async (_event, orderId: number) => await orderService.getOrderProducts(orderId));

// Handlers IPC — Pagos
ipcMain.handle('payments:getAll', async () => await paymentService.getAllPayments());
ipcMain.handle('payments:getPaginated', async (_event, page: number, limit: number, filters: Record<string, unknown>) =>
  await paymentService.getPaymentsPaginated(page, limit, filters));
ipcMain.handle('payments:getPaymentsByOrderId', async (_event, orderId: number) => await paymentService.getPaymentsByOrderId(orderId));
ipcMain.handle('payments:getById', async (_event, id: number) => await paymentService.getPaymentById(id));
ipcMain.handle('payments:create', async (_event, data: CreatePaymentData) => await paymentService.createPayment(data));
ipcMain.handle('payments:update', async (_event, id: number, data: UpdatePaymentData) => await paymentService.updatePayment(id, data));
ipcMain.handle('payments:delete', async (_event, id: number) => await paymentService.deletePayment(id));
ipcMain.handle('payments:getByClientId', async (_event, clientId: number) => await paymentService.getPaymentsByClientId(clientId));

// Handlers IPC — Presupuestos
ipcMain.handle('budgets:getAll', async () => await budgetService.getAllBudgets());
ipcMain.handle('budgets:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await budgetService.getBudgetsPaginated(page, limit, searchTerm));
ipcMain.handle('budgets:search', async (_event, page: number, limit: number, searchTerm: string) =>
  await budgetService.getBudgetsPaginated(page, limit, searchTerm));
ipcMain.handle('budgets:getById', async (_event, id: number) => await budgetService.getBudgetById(id));
ipcMain.handle('budgets:getByClientId', async (_event, clientId: number) => await budgetService.getBudgetByClientId(clientId));
ipcMain.handle('budgets:create', async (_event, data: BudgetData) => await budgetService.createBudget(data));
ipcMain.handle('budgets:update', async (_event, id: number, data: BudgetData) => await budgetService.updateBudget(id, data));
ipcMain.handle('budgets:delete', async (_event, id: number) => await budgetService.deleteBudget(id));
ipcMain.handle('budgets:getProducts', async (_event, budgetId: number) => await budgetService.getBudgetProducts(budgetId));
ipcMain.handle('budgets:recalculateTotal', async (_event, budgetId: number) => await budgetService.recalculateBudgetTotal(budgetId));
ipcMain.handle('budgets:transformToOrder', async (_event, budgetId: number, userId: number) =>
  await budgetService.transformToOrder(budgetId, userId));
ipcMain.handle('budgets:getNextId', async () => await budgetService.getNextId());

// Handlers IPC — Stats
ipcMain.handle('stats:getSales', async (_event, params: SalesStatsParams) => await statsService.getSalesStats(params));
ipcMain.handle('stats:getProducts', async () => await statsService.getProducts());
ipcMain.handle('stats:getYears', async () => await statsService.getAvailableYears());
ipcMain.handle('stats:getWeeks', async (_event, year: number) => await statsService.getAvailableWeeks(year));

// Handlers IPC — Órdenes rápidas (Simple Orders)
ipcMain.handle('simpleOrders:getAll', async () => await simpleOrderService.getAllSimpleOrders());
ipcMain.handle('simpleOrders:getPaginated', async (_event, page: number, limit: number, searchTerm: string) =>
  await simpleOrderService.getSimpleOrdersPaginated(page, limit, searchTerm));
ipcMain.handle('simpleOrders:getById', async (_event, id: number) => await simpleOrderService.getSimpleOrderById(id));
ipcMain.handle('simpleOrders:create', async (_event, data: SimpleOrderData) => await simpleOrderService.createSimpleOrder(data));
ipcMain.handle('simpleOrders:update', async (_event, id: number, data: SimpleOrderData) => await simpleOrderService.updateSimpleOrder(id, data));
ipcMain.handle('simpleOrders:delete', async (_event, id: number) => await simpleOrderService.deleteSimpleOrder(id));
ipcMain.handle('simpleOrders:addPayment', async (_event, data: AddSimplePaymentData) => await simpleOrderService.addPayment(data));
ipcMain.handle('simpleOrders:getPayments', async (_event, id: number) => await simpleOrderService.getPayments(id));
ipcMain.handle('simpleOrders:updatePayment', async (_event, id: number, data: Record<string, unknown>) => await simpleOrderService.updatePayment(id, data));
ipcMain.handle('simpleOrders:deletePayment', async (_event, id: number) => await simpleOrderService.deletePayment(id));

// Handlers IPC — Sesiones de caja
ipcMain.handle('cashSessions:getAll', async (_event, page: number, limit: number) => await cashSessionService.getAll(page, limit));
ipcMain.handle('cashSessions:getClosed', async (_event, page: number, limit: number) => await cashSessionService.getClosed(page, limit));
ipcMain.handle('cashSessions:getActive', async () => await cashSessionService.getActive());
ipcMain.handle('cashSessions:getById', async (_event, id: number) => await cashSessionService.getById(id));
ipcMain.handle('cashSessions:getByDateRange', async (_event, from: string, to: string) => await cashSessionService.getByDateRange(from, to));
ipcMain.handle('cashSessions:getSummary', async (_event, id: number) => await cashSessionService.getSummary(id));
ipcMain.handle('cashSessions:open', async (_event, data: OpenSessionData) => await cashSessionService.open(data));
ipcMain.handle('cashSessions:close', async (_event, id: number, data: CloseSessionData) => await cashSessionService.close(id, data));
ipcMain.handle('cashSessions:update', async (_event, id: number, data: OpenSessionData) => await cashSessionService.update(id, data));
ipcMain.handle('cashSessions:reopen', async (_event, id: number) => await cashSessionService.reopen(id));

// Handlers IPC — Gastos
ipcMain.handle('expenses:getAll', async (_event, page: number, limit: number) => await expensesService.getAll(page, limit));
ipcMain.handle('expenses:getByCashSession', async (_event, cashSessionId: number) => await expensesService.getByCashSession(cashSessionId));
ipcMain.handle('expenses:getById', async (_event, id: number) => await expensesService.getById(id));
ipcMain.handle('expenses:create', async (_event, data: CreateExpenseData) => await expensesService.create(data));
ipcMain.handle('expenses:update', async (_event, id: number, data: UpdateExpenseData) => await expensesService.update(id, data));
ipcMain.handle('expenses:delete', async (_event, id: number) => await expensesService.delete(id));

// Handlers IPC — Proveedores
ipcMain.handle('suppliers:getAll', async () => await supplierService.getAllSuppliers());
ipcMain.handle('suppliers:getById', async (_event, id: number) => await supplierService.getSupplierById(id));
ipcMain.handle('suppliers:create', async (_event, data: SupplierData) => await supplierService.createSupplier(data));
ipcMain.handle('suppliers:update', async (_event, id: number, data: SupplierData) => await supplierService.updateSupplier(id, data));
ipcMain.handle('suppliers:delete', async (_event, id: number) => await supplierService.deleteSupplier(id));
ipcMain.handle('suppliers:search', async (_event, searchTerm: string) => await supplierService.searchSuppliers(searchTerm));

// Handlers IPC — Órdenes de proveedor
ipcMain.handle('supplierOrders:getAll', async () => await supplierOrderService.getAllSupplierOrders());
ipcMain.handle('supplierOrders:getById', async (_event, id: number) => await supplierOrderService.getSupplierOrderById(id));
ipcMain.handle('supplierOrders:getBySupplierId', async (_event, supplierId: number) => await supplierOrderService.getSupplierOrdersBySupplierId(supplierId));
ipcMain.handle('supplierOrders:getByOrderId', async (_event, orderId: number) => await supplierOrderService.getSupplierOrdersByOrderId(orderId));
ipcMain.handle('supplierOrders:create', async (_event, data: SupplierOrderData) => await supplierOrderService.createSupplierOrder(data));
ipcMain.handle('supplierOrders:update', async (_event, id: number, data: SupplierOrderData) => await supplierOrderService.updateSupplierOrder(id, data));
ipcMain.handle('supplierOrders:delete', async (_event, id: number) => await supplierOrderService.deleteSupplierOrder(id));
ipcMain.handle('supplierOrders:getPreviousItems', async (_event, supplierId: number) => await supplierOrderService.getPreviousItemsBySupplier(supplierId));

// Handlers IPC — Bitácora de impresión
ipcMain.handle('printLogs:getActive', async () => await printLogService.getActivePrintLogs());
ipcMain.handle('printLogs:getPaginated', async (_event, page: number, limit: number, searchTerm: string, searchDate: string | null) =>
  await printLogService.getPrintLogsPaginated(page, limit, searchTerm, searchDate));
ipcMain.handle('printLogs:getHistoryDays', async (_event, todayLocalStr: string, page: number, limit: number, searchTerm: string, searchDate: string | null) =>
  await printLogService.getPrintLogsHistoryDays(todayLocalStr, page, limit, searchTerm, searchDate));
ipcMain.handle('printLogs:getByDay', async (_event, dateLocalStr: string) => await printLogService.getPrintLogsByDay(dateLocalStr));
ipcMain.handle('printLogs:getById', async (_event, id: number) => await printLogService.getPrintLogById(id));
ipcMain.handle('printLogs:getByOrderId', async (_event, orderId: number) => await printLogService.getPrintLogsByOrderId(orderId));
ipcMain.handle('printLogs:create', async (_event, data: PrintLogData) => await printLogService.createPrintLog(data));
ipcMain.handle('printLogs:update', async (_event, id: number, data: PrintLogData) => await printLogService.updatePrintLog(id, data));
ipcMain.handle('printLogs:updateCheckboxes', async (_event, id: number, data: PrintLogCheckboxData) => await printLogService.updatePrintLogCheckboxes(id, data));
ipcMain.handle('printLogs:delete', async (_event, id: number) => await printLogService.deletePrintLog(id));

// Handlers IPC — Imágenes
ipcMain.handle('upload-image', async (_event, productId: number, buffer: Buffer, originalName: string) =>
  await imageService.uploadImage(productId, buffer, originalName));
ipcMain.handle('delete-image', async (_event, relativePath: string) =>
  await imageService.deleteImage(relativePath));

// Handlers IPC — WhatsApp
ipcMain.handle('whatsapp:open', () => {
  if (!whatsappWindow) initWhatsApp();
  whatsappWindow?.show();
  whatsappWindow?.focus();
});

// Abrir URLs en el navegador predeterminado del sistema (Intercepción para WhatsApp)
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (url.includes('web.whatsapp.com')) {
    if (!whatsappWindow) initWhatsApp();
    whatsappWindow?.show();
    whatsappWindow?.focus();

    const currentURL = whatsappWindow?.webContents.getURL() ?? '';
    // Si la página ya terminó de cargar, usamos un "hack" inyectando un enlace.
    // Esto hace que el router interno (SPA) de WhatsApp intercepte el cambio de URL
    // y abra el chat al instante sin recargar (refresh) toda la página.
    if (currentURL.includes('web.whatsapp.com') && !whatsappWindow?.webContents.isLoading()) {
      whatsappWindow?.webContents.executeJavaScript(`
        (() => {
          const a = document.createElement('a');
          a.href = "${url}";
          document.body.appendChild(a);
          a.click();
          a.remove();
        })();
      `).catch(() => {
        whatsappWindow?.loadURL(url); // Fallback
      });
    } else {
      // Si la app apenas arrancó o está cargando inicial, hacemos la navegación normal
      whatsappWindow?.loadURL(url, { userAgent: WHATSAPP_USER_AGENT });
    }
  } else {
    await shell.openExternal(url);
  }
});

// Handlers IPC — Auto-updater (install)
ipcMain.handle('updater:install', async () => {
  // Cambiar a isSilent: false para que muestre la interfaz del instalador.
  // Si está en true y requiere permisos de administrador (UAC), fallará silenciosamente.
  if (downloadedUpdatePath) {
    log.info('Lanzando actualización usando spawn seguro (con flags de updater):', downloadedUpdatePath);
    // Este WORKAROUND imita exhaustivamente a autoUpdater.quitAndInstall(false, true)
    // inyectando '--updated' y '--force-run'. La pieza clave es la capa { shell: true } en NodeJS.
    // Esto resuelve el error "Windows cannot find file" mitigando un bug interno de UAC en Node/libuv al haber espacios en la cuenta de usuario.
    const args: string[] = ['--updated', '--force-run'];
    const spawnOptions = { detached: true, stdio: 'ignore' as const, shell: true };

    try {
      // Rodeamos la ruta entre comillas dobles explícitamente para el CMD de Windows
      const child = spawn(`"${downloadedUpdatePath}"`, args, spawnOptions);
      child.unref();
      // Aplicamos un pequeño delay de gracia antes de salir para que spawn termine de levantar el thread
      setTimeout(() => app.quit(), 200);
    } catch (err) {
      log.error('Error lanzando updater de NSIS:', err);
      autoUpdater.quitAndInstall(false, true);
    }
  } else {
    log.info('Fall back a autoUpdater.quitAndInstall (sin ruta descargada)');
    autoUpdater.quitAndInstall(false, true);
  }
});

// App lifecycle — whenReady
app.whenReady().then(async () => {
  // ← Inicializar la DB explícitamente (ya no se llama automáticamente al importar)
  await initDb();

  const baseImagePath = imageService.getBasePath() as string;

  if (protocol.handle) {
    // Para Electron >= 25 (el usado es v37)
    protocol.handle('imagenes', (request: Request) => {
      const urlPath = request.url.replace(/^imagenes:\/\//i, '');
      const absolutePath = path.normalize(path.join(baseImagePath, decodeURIComponent(urlPath)));

      // Prevenir directory traversal
      if (!absolutePath.startsWith(path.normalize(baseImagePath))) {
        return new Response('Acceso denegado', { status: 403 });
      }

      return net.fetch('file://' + absolutePath);
    });
  } else {
    // Compatibilidad para versiones legacy como solicitado
    protocol.registerFileProtocol('imagenes', (request, callback) => {
      const urlPath = request.url.replace(/^imagenes:\/\//i, '');
      const absolutePath = path.normalize(path.join(baseImagePath, decodeURIComponent(urlPath)));

      if (!absolutePath.startsWith(path.normalize(baseImagePath))) {
        callback({ error: -3 }); // Acceso denegado (ERR_ACCESS_DENIED)
        return;
      }
      callback({ path: absolutePath });
    });
  }

  createWindow();
  initWhatsApp(); // Arrancar WhatsApp Web en memoria al inicio

  // Revisar actualizaciones al arrancar (solo en producción)
  if (app.isPackaged) {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false;

    autoUpdater.on('update-available', (info) => {
      log.info('Actualización disponible:', info.version);
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('updater:update-available', { version: info.version });
      });
    });

    function parseReleaseNotes(
      notes: string | Array<{ note?: string; notes?: string }> | unknown
    ): string {
      const fallback = 'Mejoras de rendimiento y correcciones de errores.';
      if (!notes) return fallback;

      let rawNotes: unknown = notes;
      // Por compatibilidad por si electron-updater devuelve un array o objeto
      if (Array.isArray(notes)) {
        rawNotes = notes[0]?.note || notes[0]?.notes || '';
      }

      if (typeof rawNotes === 'string') {
        const parsed = rawNotes
          .replace(/<\/h[1-6]>/gi, '\n\n')
          .replace(/<\/p>/gi, '\n')
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<li>/gi, '• ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<[^>]*>?/gm, '')
          .trim();
        return parsed || fallback;
      }

      return fallback;
    }

    autoUpdater.on('update-downloaded', (info) => {
      log.info('Actualización descargada:', info.version);
      log.info('Ruta del instalador:', info.downloadedFile);
      downloadedUpdatePath = info.downloadedFile; // Guardar ruta para el workaround
      const notes = parseReleaseNotes(info.releaseNotes);
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('updater:update-downloaded', { version: info.version, notes });
      });
    });

    autoUpdater.on('error', (err: Error) => {
      log.error('Error en el updater:', err.message);
    });

    autoUpdater.checkForUpdates();
  }
});

// App lifecycle — eventos de cierre
app.on('before-quit', () => {
  isQuitting = true;
  authService.logout();
});

app.on('window-all-closed', () => {
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
