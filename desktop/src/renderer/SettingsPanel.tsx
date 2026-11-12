import { useEffect, useState } from 'react';

import type { Printer, Settings } from '../shared/bridge';

interface SettingsPanelProps {
  settings: Settings;
  onSaved: (settings: Settings) => void;
  /** Absent on first run and inside the app (there's nothing to go back to) */
  onCancel?: () => void;
}

export function SettingsPanel({ settings, onSaved, onCancel }: SettingsPanelProps) {
  const [draft, setDraft] = useState<Settings>(settings);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [version, setVersion] = useState('');

  useEffect(() => {
    void window.ensushi.listPrinters().then(setPrinters);
    void window.ensushi.getVersion().then(setVersion);
  }, []);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const testPrint = async () => {
    await window.ensushi.saveSettings(draft);
    const result = await window.ensushi.print(
      `<!doctype html><html><body style="margin:0;padding:3mm;width:${draft.paperWidth - 8}mm;font:14px Arial">
        <b>EnSushi · prueba de impresión</b><br>${new Date().toLocaleString('es-AR')}<br>Si se lee bien, la ticketera está lista.
      </body></html>`,
    );
    setTestResult(result.ok ? 'Enviado a la impresora.' : result.error);
  };

  const save = async () => {
    onSaved(await window.ensushi.saveSettings(draft));
    setSaved(true);
  };

  return (
    <div className="page narrow">
      <div className="page-head">
        <div>
          <h1>Ajustes</h1>
          {version && <p className="muted num">Versión {version}. Las nuevas se descargan solas desde el servidor.</p>}
        </div>
      </div>

      <div className="block">
        <h2>Ticketera</h2>
        <div className="field">
          <label htmlFor="printer">Impresora</label>
          <select id="printer" value={draft.printerName} onChange={(e) => set('printerName', e.target.value)}>
            <option value="">— Elegí la impresora —</option>
            {printers.map((printer) => (
              <option key={printer.name} value={printer.name}>
                {printer.displayName}
              </option>
            ))}
          </select>
          <span className="hint">La TM-T20 aparece acá cuando está instalado su driver de Windows (Epson Advanced Printer Driver).</span>
        </div>
        <div className="field">
          <span className="label">Ancho del papel</span>
          <div className="choices" role="group" aria-label="Ancho del papel">
            {([80, 58] as const).map((width) => (
              <button key={width} className="choice" aria-pressed={draft.paperWidth === width} onClick={() => set('paperWidth', width)}>
                {width} mm
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input type="checkbox" checked={draft.printOnConfirm} onChange={(e) => set('printOnConfirm', e.target.checked)} />
          Imprimir la comanda al confirmar
        </label>
        <div className="inline">
          <button className="btn" disabled={!draft.printerName} onClick={() => void testPrint()}>
            Imprimir prueba
          </button>
          {testResult && <span className="small">{testResult}</span>}
        </div>
      </div>

      <div className="block">
        <h2>Mensajes al cliente</h2>
        <div className="field">
          <label htmlFor="alias">Alias para transferencias</label>
          <input id="alias" value={draft.transferAlias} onChange={(e) => set('transferAlias', e.target.value)} />
          <span className="hint">Va en el mensaje de confirmación cuando pagan por transferencia. No se publica en la web.</span>
        </div>
        <div className="field">
          <label htmlFor="address">Dirección del local (para retiros)</label>
          <input id="address" value={draft.pickupAddress} onChange={(e) => set('pickupAddress', e.target.value)} />
        </div>
      </div>

      <div className="block">
        <h2>Conexión</h2>
        <div className="field">
          <label htmlFor="server">Dirección del servidor</label>
          <input id="server" placeholder="https://ensushi.ar" value={draft.serverUrl} onChange={(e) => set('serverUrl', e.target.value)} />
        </div>
      </div>

      <div className="inline">
        <button className="btn primary" disabled={!draft.serverUrl} onClick={() => void save()}>
          Guardar
        </button>
        {onCancel && (
          <button className="btn" onClick={onCancel}>
            Volver
          </button>
        )}
        {saved && <span className="ok small">Guardado.</span>}
      </div>
    </div>
  );
}
