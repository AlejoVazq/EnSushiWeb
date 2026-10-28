/** What the main process offers the window (exposed as `window.ensushi` by the preload) */

export interface Settings {
  /** The web's address, e.g. https://ensushi.com.ar (http://localhost:3000 in development) */
  serverUrl: string;
  /** Windows printer name of the ticket printer ("EPSON TM-T20 Receipt"); '' = not set */
  printerName: string;
  /** Paper width in mm: the TM-T20 takes 80 (or 58 with its setting changed) */
  paperWidth: 58 | 80;
  /** Print the comanda as soon as an order is confirmed */
  printOnConfirm: boolean;
  /** Alias for transfers, sent in the confirmation message; never on the web */
  transferAlias: string;
  /** Shown in the confirmation message for pickups */
  pickupAddress: string;
}

export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiResponse {
  status: number;
  /** Parsed JSON body (or null) */
  data: unknown;
}

export interface Printer {
  /** What Windows (and printing) calls it */
  name: string;
  displayName: string;
}

export interface EnsushiBridge {
  getSettings(): Promise<Settings>;
  saveSettings(settings: Partial<Settings>): Promise<Settings>;
  hasToken(): Promise<boolean>;
  /** Logs in against the server and keeps the token (encrypted with Windows' user key) */
  login(username: string, password: string): Promise<{ ok: true } | { ok: false; error: string }>;
  logout(): Promise<void>;
  /** A request to the server's /api/local/…, with the token */
  api(method: ApiMethod, path: string, body?: unknown): Promise<ApiResponse>;
  listPrinters(): Promise<Printer[]>;
  /** Prints the HTML on the configured printer, without a dialog */
  print(html: string): Promise<{ ok: true } | { ok: false; error: string }>;
  /** Opens WhatsApp (wa.me) with the message for the customer */
  openWhatsApp(phone: string, message: string): Promise<void>;
  /** The installed version, e.g. "0.2.0" */
  getVersion(): Promise<string>;
  /** Called once a new version finished downloading (it installs when the app closes, or with installUpdate) */
  onUpdateReady(callback: (version: string) => void): void;
  /** Closes the app, installs the downloaded version and opens it again */
  installUpdate(): Promise<void>;
}

declare global {
  interface Window {
    ensushi: EnsushiBridge;
  }
}
