const { app, BrowserWindow, ipcMain, protocol, net, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

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
const statsService = require('./services/statsService');
const simpleOrderService = require('./services/simpleOrderService');
const imageService = require('./services/imageService');

// Configuración de logs para no ir a ciegas
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

let whatsappWindow = null;
let isQuitting = false;

// User Agent de Chrome real — necesario porque WhatsApp Web bloquea
// deliberadamente cualquier request que contenga "Electron" en el UA.
const WHATSAPP_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function initWhatsApp() {
  if (whatsappWindow) return;

  whatsappWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    show: false, // Inicio oculto en segundo plano
    title: 'WhatsApp Web',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Sobrescribir el userAgent aquí también para peticiones internas
      userAgent: WHATSAPP_USER_AGENT
    }
  });

  // Agregar menú de contexto (clic derecho) para soportar guardar/copiar imágenes, pegar texto, etc.
  whatsappWindow.webContents.on('context-menu', (event, params) => {
    const { Menu, clipboard } = require('electron');
    const template = [];

    if (params.mediaType === 'image') {
      template.push(
        {
          label: 'Guardar imagen como...',
          click: () => {
            whatsappWindow.webContents.downloadURL(params.srcURL);
          }
        },
        {
          label: 'Copiar imagen',
          click: () => {
            whatsappWindow.webContents.copyImageAt(params.x, params.y);
          }
        },
        { type: 'separator' }
      );
    }

    if (params.linkURL) {
      template.push(
        {
          label: 'Copiar enlace',
          click: () => {
            clipboard.writeText(params.linkURL);
          }
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
      menu.popup({ window: whatsappWindow });
    }
  });

  // Manejar descargas para que salga el diálogo nativo de "Guardar como..."
  whatsappWindow.webContents.session.on('will-download', (event, item, webContents) => {
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
      whatsappWindow.hide();
    }
  });

  // Pre-cargar WhatsApp con un userAgent limpio (sin "Electron")
  whatsappWindow.loadURL('https://web.whatsapp.com', {
    userAgent: WHATSAPP_USER_AGENT
  });
}

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

  // Cuando se cierre la principal, cerramos la aplicación entera
  win.on('closed', () => {
    app.quit();
  });

  // Cargar la aplicación según el entorno
  if (app.isPackaged) {
    // Producción: cargar desde los archivos empaquetados
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
  } else {
    // Desarrollo: esperar a que Vite inicie antes de mostrar
    const loadDevServer = () => {
      require('http').get('http://localhost:5173', () => {
        win.loadURL('http://localhost:5173');
      }).on('error', () => {
        console.log('Esperando a que inicialice el servidor de Vite en el puerto 5173...');
        setTimeout(loadDevServer, 1000);
      });
    };
    loadDevServer();
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
ipcMain.handle('products:findSimilarNames', async () => await productService.getProductsWithSimilarNames());

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
ipcMain.handle('orders:getPendingForLogbook', async () => await orderService.getPendingOrdersForLogbook());
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
ipcMain.handle('budgets:update', async (event, id, data) => await budgetService.updateBudget(id, data));
ipcMain.handle('budgets:delete', async (event, id) => await budgetService.deleteBudget(id));
ipcMain.handle('budgets:getProducts', async (event, budgetId) => await budgetService.getBudgetProducts(budgetId));
ipcMain.handle('budgets:recalculateTotal', async (event, budgetId) => await budgetService.recalculateBudgetTotal(budgetId));
ipcMain.handle('budgets:transformToOrder', async (event, budgetId, userId) => await budgetService.transformToOrder(budgetId, userId));
ipcMain.handle('budgets:getNextId', async () => await budgetService.getNextId());

// Stats
ipcMain.handle('stats:getSales', async (event, params) => await statsService.getSalesStats(params));
ipcMain.handle('stats:getProducts', async () => await statsService.getProducts());
ipcMain.handle('stats:getYears', async () => await statsService.getAvailableYears());
ipcMain.handle('stats:getWeeks', async (event, year) => await statsService.getAvailableWeeks(year));

// Manejo de eventos IPC para ordenes rapidas
ipcMain.handle('simpleOrders:getAll', async () => await simpleOrderService.getAllSimpleOrders());
ipcMain.handle('simpleOrders:getById', async (event, id) => await simpleOrderService.getSimpleOrderById(id));
ipcMain.handle('simpleOrders:create', async (event, data) => await simpleOrderService.createSimpleOrder(data));
ipcMain.handle('simpleOrders:update', async (event, id, data) => await simpleOrderService.updateSimpleOrder(id, data));
ipcMain.handle('simpleOrders:delete', async (event, id) => await simpleOrderService.deleteSimpleOrder(id));
ipcMain.handle('simpleOrders:addPayment', async (event, data) => await simpleOrderService.addPayment(data));
ipcMain.handle('simpleOrders:getPayments', async (event, id) => await simpleOrderService.getPayments(id));
ipcMain.handle('simpleOrders:updatePayment', async (event, id, data) => await simpleOrderService.updatePayment(id, data));
ipcMain.handle('simpleOrders:deletePayment', async (event, id) => await simpleOrderService.deletePayment(id));

// Manejo de eventos IPC para imágenes
ipcMain.handle('upload-image', async (event, productId, buffer, originalName) => await imageService.uploadImage(productId, buffer, originalName));
ipcMain.handle('delete-image', async (event, relativePath) => await imageService.deleteImage(relativePath));

// Abrir WhatsApp directamente desde el sidebar
ipcMain.handle('whatsapp:open', () => {
  if (!whatsappWindow) initWhatsApp();
  whatsappWindow.show();
  whatsappWindow.focus();
});

// Abrir URLs en el navegador predeterminado del sistema (Intercepción para WhatsApp)
ipcMain.handle('shell:openExternal', async (_event, url) => {
  if (url.includes('web.whatsapp.com')) {
    if (!whatsappWindow) initWhatsApp();
    whatsappWindow.show();
    whatsappWindow.focus();

    const currentURL = whatsappWindow.webContents.getURL();
    // Si la página ya terminó de cargar, usamos un "hack" inyectando un enlace.
    // Esto hace que el router interno (SPA) de WhatsApp intercepte el cambio de URL 
    // y abra el chat al instante sin recargar (refresh) toda la página.
    if (currentURL.includes('web.whatsapp.com') && !whatsappWindow.webContents.isLoading()) {
      whatsappWindow.webContents.executeJavaScript(`
        (() => {
          const a = document.createElement('a');
          a.href = "${url}";
          document.body.appendChild(a);
          a.click();
          a.remove();
        })();
      `).catch(() => {
        whatsappWindow.loadURL(url); // Fallback
      });
    } else {
      // Si la app apenas arrancó o está cargando inicial, hacemos la navegación normal
      whatsappWindow.loadURL(url, { userAgent: WHATSAPP_USER_AGENT });
    }
  } else {
    await shell.openExternal(url);
  }
});

require('dotenv').config();

let downloadedUpdatePath = null;

// IPC para que el renderer pueda solicitar la instalación de la actualización
ipcMain.handle('updater:install', async () => {
  // Cambiar a isSilent: false para que muestre la interfaz del instalador.
  // Si está en true y requiere permisos de administrador (UAC), fallará silenciosamente.
  if (downloadedUpdatePath) {
    log.info('Lanzando actualización usando spawn seguro (con flags de updater):', downloadedUpdatePath);
    // Este WORKAROUND imita exhaustivamente a autoUpdater.quitAndInstall(false, true) 
    // inyectando '--updated' y '--force-run'. La pieza clave es la capa { shell: true } en NodeJS. 
    // Esto resuelve el error "Windows cannot find file" mitigando un bug interno de UAC en Node/libuv al haber espacios en la cuenta de usuario.
    const args = ['--updated', '--force-run'];
    const spawnOptions = {
      detached: true,
      stdio: 'ignore',
      shell: true // Es crucial para resolver espacios en rutas bajo UAC
    };
    
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

app.whenReady().then(() => {
  const baseImagePath = imageService.getBasePath();
  
  if (protocol.handle) {
    // Para Electron >= 25 (el usado es v37)
    protocol.handle('imagenes', (request) => {
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
    // Descargar automáticamente sin preguntar
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = false; // El usuario decide cuándo instalar

    autoUpdater.on('update-available', (info) => {
      log.info('Actualización disponible:', info.version);
      // Notificar al renderer para mostrar el banner
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('updater:update-available', { version: info.version });
      });
    });

    // Función para extraer las notas de la release desde Git
    function parseReleaseNotes(notes) {
      const fallback = "Mejoras de rendimiento y correcciones de errores.";
      if (!notes) return fallback;
      
      let rawNotes = notes;
      // Por compatibilidad por si electron-updater devuelve un array o objeto
      if (Array.isArray(notes)) {
        rawNotes = notes[0]?.note || notes[0]?.notes || "";
      }
      
      if (typeof rawNotes === 'string') {
        // Convertimos el HTML/texto de GitHub a formato puramente textual manteniendo las listas y saltos
        const parsed = rawNotes
          .replace(/<\/h[1-6]>/gi, '\n\n') // Separar encabezados
          .replace(/<\/p>/gi, '\n')       // Separar párrafos
          .replace(/<br\s*\/?>/gi, '\n')  // Saltos de línea <br>
          .replace(/<li>/gi, '• ')        // Agregar viñetas (bullets) en los items de lista
          .replace(/<\/li>/gi, '\n')      // Salto de línea después de cada item
          .replace(/<[^>]*>?/gm, '')      // Limpiar cualquier otra etiqueta HTML (<a>, <strong>, etc)
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
      // Notificar al renderer para cambiar el banner a "listo para instalar"
      BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('updater:update-downloaded', { version: info.version, notes });
      });
    });

    autoUpdater.on('error', (err) => {
      log.error('Error en el updater:', err.message);
    });

    autoUpdater.checkForUpdates();
  }
});

// Limpiar sesión al cerrar la aplicación
app.on('before-quit', () => {
  isQuitting = true;
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