import { app, BrowserWindow, ipcMain, protocol, net, shell, Menu, clipboard } from 'electron';
import * as path from 'path';
import { spawn } from 'child_process';
import { autoUpdater } from 'electron-updater';
import * as log from 'electron-log';
import * as http from 'http';
import './env';

import { initDb } from './db';
import authService from './services/authService';
import imageService from './services/imageService';
import { registerIpcHandlers } from './ipc';

// ── Tipos IPC — organizados por agregado ─────────────────────────────────────


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
    win.loadFile(path.join(__dirname, '../../renderer/dist/index.html'));
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
  // Inicializar manejadores IPC
  registerIpcHandlers();

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
