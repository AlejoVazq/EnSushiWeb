import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { app, BrowserWindow, ipcMain, net, safeStorage, shell } from 'electron';

import type { ApiResponse, Settings } from './shared/bridge';

// ─── Settings (userData/config.json) ────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  serverUrl: app.isPackaged ? '' : 'http://localhost:3000',
  printerName: '',
  paperWidth: 80,
  printOnConfirm: false,
  transferAlias: '',
  pickupAddress: 'Puerto Rico 248',
};

interface StoredConfig {
  settings: Settings;
  /** Staff token, encrypted with Windows' user key (safeStorage) when available */
  token: string | null;
  tokenEncrypted: boolean;
}

const configPath = () => join(app.getPath('userData'), 'config.json');

const readConfig = (): StoredConfig => {
  try {
    const raw = JSON.parse(readFileSync(configPath(), 'utf8')) as Partial<StoredConfig>;
    return {
      settings: { ...DEFAULT_SETTINGS, ...raw.settings },
      token: raw.token ?? null,
      tokenEncrypted: raw.tokenEncrypted ?? false,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, token: null, tokenEncrypted: false };
  }
};

const writeConfig = (config: StoredConfig) => writeFileSync(configPath(), JSON.stringify(config, null, 2));

const getToken = async (): Promise<string | null> => {
  const { token, tokenEncrypted } = readConfig();
  if (!token) return null;
  if (!tokenEncrypted) return token;
  try {
    return (await safeStorage.decryptStringAsync(Buffer.from(token, 'base64'))).result;
  } catch {
    // Another Windows user or a reinstalled system: log in again
    return null;
  }
};

const setToken = async (token: string | null) => {
  const encrypt = token !== null && (await safeStorage.isAsyncEncryptionAvailable());
  const stored = token === null ? null : encrypt ? (await safeStorage.encryptStringAsync(token)).toString('base64') : token;
  writeConfig({ ...readConfig(), token: stored, tokenEncrypted: encrypt });
};

// ─── Server ─────────────────────────────────────────────────────────────────

const serverRequest = async (method: string, path: string, body?: unknown, token?: string | null): Promise<ApiResponse> => {
  const { serverUrl } = readConfig().settings;
  if (!serverUrl) return { status: 0, data: { error: 'Falta la dirección del servidor (Ajustes).' } };
  try {
    const response = await net.fetch(new URL(path, serverUrl).toString(), {
      method,
      headers: {
        ...(body !== undefined && { 'content-type': 'application/json' }),
        ...(token && { authorization: `Bearer ${token}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    return { status: response.status, data };
  } catch {
    return { status: 0, data: { error: 'Sin conexión con el servidor.' } };
  }
};

const errorOf = (response: ApiResponse, fallback: string): string => {
  const { data } = response;
  return typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string' ? data.error : fallback;
};

// ─── Window ─────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'EnSushi Local',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  void mainWindow.loadFile(join(__dirname, 'index.html'));
  // Links never open inside the app
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// ─── Printing ───────────────────────────────────────────────────────────────

/**
 * Prints through the Windows driver of the ticket printer (Epson's TM-T20 driver), silently: the HTML is laid
 * out at the paper's width in a hidden window. The driver handles the cut.
 */
const printHtml = async (html: string): Promise<{ ok: true } | { ok: false; error: string }> => {
  const { printerName, paperWidth } = readConfig().settings;
  if (!printerName) return { ok: false, error: 'Elegí la impresora en Ajustes.' };

  const win = new BrowserWindow({ show: false, webPreferences: { sandbox: true, javascript: false } });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    return await new Promise((resolve) => {
      win.webContents.print(
        {
          silent: true,
          deviceName: printerName,
          printBackground: false,
          margins: { marginType: 'none' },
          // Microns; the length is the driver's (receipt printers cut where the content ends)
          pageSize: { width: paperWidth * 1000, height: 297000 },
        },
        (success, failureReason) => resolve(success ? { ok: true } : { ok: false, error: `No se pudo imprimir: ${failureReason}` }),
      );
    });
  } finally {
    win.destroy();
  }
};

// ─── IPC ────────────────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => readConfig().settings);

ipcMain.handle('settings:save', (_event, partial: Partial<Settings>) => {
  const config = readConfig();
  const settings: Settings = { ...config.settings, ...partial };
  if (settings.serverUrl) settings.serverUrl = settings.serverUrl.trim().replace(/\/+$/, '');
  writeConfig({ ...config, settings });
  return settings;
});

ipcMain.handle('auth:has', async () => (await getToken()) !== null);

ipcMain.handle('auth:login', async (_event, username: string, password: string) => {
  const response = await serverRequest('POST', '/api/local/sesion', { username, password });
  const token =
    typeof response.data === 'object' && response.data !== null && 'token' in response.data ? response.data.token : null;
  if (response.status !== 200 || typeof token !== 'string') {
    return { ok: false, error: errorOf(response, 'No se pudo ingresar.') };
  }
  await setToken(token);
  return { ok: true };
});

ipcMain.handle('auth:logout', () => setToken(null));

ipcMain.handle('api:request', async (_event, method: 'GET' | 'PATCH', path: string, body?: unknown) => {
  // Only the shop's own endpoints
  if (!path.startsWith('/api/local/')) return { status: 400, data: { error: 'Ruta no permitida.' } };
  const response = await serverRequest(method, path, body, await getToken());
  if (response.status === 401) await setToken(null);
  return response;
});

ipcMain.handle('printers:list', async () => {
  const printers = (await mainWindow?.webContents.getPrintersAsync()) ?? [];
  return printers.map((printer) => ({ name: printer.name, displayName: printer.displayName || printer.name }));
});

ipcMain.handle('print', (_event, html: string) => printHtml(html));

ipcMain.handle('whatsapp:open', async (_event, phone: string, message: string) => {
  if (!/^\d{10,15}$/.test(phone)) return;
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  // Development tests: log the link instead of opening WhatsApp on the PC
  if (!app.isPackaged && process.env.ENSUSHI_SIN_WHATSAPP === '1') {
    console.log(`[whatsapp] ${url}`);
    return;
  }
  await shell.openExternal(url);
});

// ─── App ────────────────────────────────────────────────────────────────────

// One copy only: a second launch brings the open one to the front
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow?.isMinimized()) mainWindow.restore();
    mainWindow?.focus();
  });
  void app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
