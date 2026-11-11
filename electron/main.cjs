/**
 * ShadowCalc desktop shell (Electron).
 *
 * Loads the production web build bundled inside the app, so the whole app works with no
 * internet connection. Exchange rates are fetched when online and the last
 * good set is kept in local storage for offline use.
 *
 * Security: no Node.js in the renderer, context isolation and the Chromium
 * sandbox are on, navigation away from the app is blocked, and external links
 * open in the user's default browser.
 */
const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.aishadow.shadowcalc';
const DIST = path.join(__dirname, '..', 'dist');
const ICON = path.join(__dirname, '..', 'build', 'icon.png');

// The app is served from a private, secure "app://shadowcalc" origin rather
// than file://, so ES modules, fetch and local storage behave exactly as they
// do on the web — and saved rates persist between launches.
const SCHEME = 'app';
const ORIGIN = `${SCHEME}://shadowcalc`;

protocol.registerSchemesAsPrivileged([
  { scheme: SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

function registerAppProtocol() {
  protocol.handle(SCHEME, (request) => {
    const { pathname } = new URL(request.url);
    const relative = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
    const filePath = path.normalize(path.join(DIST, relative));
    // Never serve anything outside the bundled app.
    if (filePath !== DIST && !filePath.startsWith(DIST + path.sep)) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(filePath).toString());
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow = null;

function isExternal(url) {
  return /^https?:\/\//i.test(url);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 380,
    minHeight: 640,
    title: 'ShadowCalc',
    icon: ICON,
    backgroundColor: '#070c18',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Open http(s) links (e.g. rate-provider attribution) in the default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternal(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith(ORIGIN)) return;
    event.preventDefault();
    if (isExternal(url)) void shell.openExternal(url);
  });

  void mainWindow.loadURL(`${ORIGIN}/index.html`);
}

app.on('second-instance', () => {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
});

app.whenReady().then(() => {
  if (process.platform === 'win32') app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);
  registerAppProtocol();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
