import { useEffect, useState } from 'react';

import type { Settings } from '../shared/bridge';

import { Login } from './Login';
import { Orders } from './Orders';
import { SettingsPanel } from './SettingsPanel';

type Screen = 'loading' | 'login' | 'orders' | 'settings';

export function App() {
  const [screen, setScreen] = useState<Screen>('loading');
  const [settings, setSettings] = useState<Settings | null>(null);
  // A new version already downloaded, waiting to be installed
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);

  useEffect(() => window.ensushi.onUpdateReady(setUpdateVersion), []);

  useEffect(() => {
    void (async () => {
      const loaded = await window.ensushi.getSettings();
      setSettings(loaded);
      if (!loaded.serverUrl) setScreen('settings');
      else setScreen((await window.ensushi.hasToken()) ? 'orders' : 'login');
    })();
  }, []);

  const toLoginOrOrders = async () => setScreen((await window.ensushi.hasToken()) ? 'orders' : 'login');

  if (screen === 'loading' || !settings) {
    return (
      <div className="center-screen">
        <p className="muted">Cargando…</p>
      </div>
    );
  }

  // Before logging in (first run, or from the login screen); once inside, Ajustes lives in the rail
  if (screen === 'settings') {
    return (
      <div className="center-screen">
        <div style={{ maxWidth: 640 }}>
          <SettingsPanel
            settings={settings}
            onSaved={(saved) => {
              setSettings(saved);
              void toLoginOrOrders();
            }}
            onCancel={settings.serverUrl ? () => void toLoginOrOrders() : undefined}
          />
        </div>
      </div>
    );
  }

  if (screen === 'login') return <Login onLoggedIn={() => setScreen('orders')} onSettings={() => setScreen('settings')} />;

  return <Orders settings={settings} updateVersion={updateVersion} onLoggedOut={() => setScreen('login')} onSettingsSaved={setSettings} />;
}
