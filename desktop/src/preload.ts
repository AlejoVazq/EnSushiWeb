import { contextBridge, ipcRenderer } from 'electron';

import type { EnsushiBridge } from './shared/bridge';

// The window gets only these calls; it has no Node or Electron access of its own
const bridge: EnsushiBridge = {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),
  hasToken: () => ipcRenderer.invoke('auth:has'),
  login: (username, password) => ipcRenderer.invoke('auth:login', username, password),
  logout: () => ipcRenderer.invoke('auth:logout'),
  api: (method, path, body) => ipcRenderer.invoke('api:request', method, path, body),
  listPrinters: () => ipcRenderer.invoke('printers:list'),
  print: (html) => ipcRenderer.invoke('print', html),
  openWhatsApp: (phone, message) => ipcRenderer.invoke('whatsapp:open', phone, message),
  getVersion: () => ipcRenderer.invoke('app:version'),
  onUpdateReady: (callback) => {
    ipcRenderer.on('update:ready', (_event, version: string) => callback(version));
  },
  installUpdate: () => ipcRenderer.invoke('update:install'),
};

contextBridge.exposeInMainWorld('ensushi', bridge);
