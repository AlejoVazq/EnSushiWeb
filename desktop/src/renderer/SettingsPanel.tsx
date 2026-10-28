import { useEffect, useState } from 'react';

import type { Printer, Settings } from '../shared/bridge';

interface SettingsPanelProps {
  settings: Settings;
  onSaved: (settings: Settings) => void;
  /** Absent on first run (there's nothing to go back to) */
  onCancel?: () => void;
}

export function SettingsPanel({ settings, onSaved, onCancel }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [version, setVersion] = useState('');

  useEffect(() => {
    void window.ensushi.listPrinters().then(setPrinters);
    void window.ensushi.getVersion().then(setVersion);
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setDraft((prev) => ({ ...prev, [key]: value }));

  const testPrint = async () => {
    await window.ensushi.saveSettings(draft);
    const result = await window.ensushi.print(
      `<!doctype html><html><body style="margin:0;padding:3mm;width:${draft.paperWidth - 8}mm;font:14px Arial">
        <b>EnSushi · prueba de impresión</b><br>${new Date().toLocaleString('es-AR')}<br>Si se lee bien, la ticketera está lista.
      </body></html>`,
    );
    setTestResult(result.ok ? 'Enviado a la impresora.' : result.error);
  };

  return (
    <div className="center panel" style={{ maxWidth: 560 }}>
      <h1>Ajustes</h1>
      {version && <p className="muted">Versión {version}. Las nuevas se descargan solas desde el servidor.</p>}

      <label htmlFor="server">Dirección del servidor</label>
      <input
        id="server"
        placeholder="https://ensushi.com.ar"
        value={draft.serverUrl}
        onChange={(e) => set('serverUrl', e.target.value)}
      />

      <label htmlFor="printer">Ticketera</label>
      <select id="printer" value={draft.printerName} onChange={(e) => set('printerName', e.target.value)}>
        <option value="">— Elegí la impresora —</option>
        {printers.map((printer) => (
          <option key={printer.name} value={printer.name}>
            {printer.displayName}
          </option>
        ))}
      </select>
      <p className="muted">
        La TM-T20 aparece acá cuando está instalado su driver de Windows (Epson Advanced Printer Driver).
      </p>

      <label htmlFor="paper">Ancho del papel</label>
      <select id="paper" value={draft.paperWidth} onChange={(e) => set('paperWidth', e.target.value === '58' ? 58 : 80)}>
        <option value="80">80 mm</option>
        <option value="58">58 mm</option>
      </select>

      <label>
        <input
          type="checkbox"
          style={{ width: 'auto', marginRight: 8 }}
          checked={draft.printOnConfirm}
          onChange={(e) => set('printOnConfirm', e.target.checked)}
        />
        Imprimir la comanda al confirmar
      </label>

      <label htmlFor="alias">Alias para transferencias</label>
      <input id="alias" value={draft.transferAlias} onChange={(e) => set('transferAlias', e.target.value)} />
      <p className="muted">Va en el mensaje de confirmación cuando pagan por transferencia. No se publica en la web.</p>

      <label htmlFor="address">Dirección del local (para retiros)</label>
      <input id="address" value={draft.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} />

      <p className="row" style={{ marginTop: 16 }}>
        <button className="primary" disabled={!draft.serverUrl} onClick={async () => onSaved(await window.ensushi.saveSettings(draft))}>
          Guardar
        </button>
        <button disabled={!draft.printerName} onClick={testPrint}>
          Imprimir prueba
        </button>
        {onCancel && <button onClick={onCancel}>Volver</button>}
      </p>
      {testResult && <p>{testResult}</p>}
    </div>
  );
}
