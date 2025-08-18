// const { app, BrowserWindow } = require('electron')
// const path = require('path');

// const createWindow = () => {
//   const win = new BrowserWindow({
//     width: 800,
//     height: 600
//   })

//   win.loadFile(path.join(__dirname, 'src', 'index.html'));
// }

// app.whenReady().then(() => {
//   createWindow()
// })

const { app, BrowserWindow, webFrameMain } = require('electron');

function createWindow() {
  const win = new BrowserWindow({ width: 800, height: 1500 });
  win.loadURL('http://localhost:5173/');

  win.webContents.on(
    'did-frame-navigate',
    (event, url, httpResponseCode, httpStatusText, isMainFrame, frameProcessId, frameRoutingId) => {
      const frame = webFrameMain.fromId(frameProcessId, frameRoutingId);
      if (frame) {
        const code = 'document.body.innerHTML = document.body.innerHTML.replaceAll("heck", "h*ck")';
        frame.executeJavaScript(code);
      }
    }
  );
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
