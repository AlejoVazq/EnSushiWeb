import { useState, type FormEvent } from 'react';

interface LoginProps {
  onLoggedIn: () => void;
  onSettings: () => void;
}

export function Login({ onLoggedIn, onSettings }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await window.ensushi.login(username, password);
    setBusy(false);
    if (result.ok) onLoggedIn();
    else setError(result.error);
  };

  return (
    <div className="center-screen">
      <form className="block" style={{ gap: 20, padding: 28 }} onSubmit={submit}>
        <img className="logo" src="logo.png" alt="EnSushi" />
        <div style={{ display: 'grid', gap: 4 }}>
          <h1>Pedidos del local</h1>
          <p className="muted">Ingresá con el usuario del local.</p>
        </div>
        <div className="field">
          <label htmlFor="user">Usuario</label>
          <input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus autoComplete="username" />
        </div>
        <div className="field">
          <label htmlFor="pass">Contraseña</label>
          <input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </div>
        {error && <p className="error">{error}</p>}
        <div className="inline">
          <button type="submit" className="btn primary" style={{ flex: 1 }} disabled={busy || !username || !password}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
          <button type="button" className="btn ghost" onClick={onSettings}>
            Ajustes
          </button>
        </div>
      </form>
    </div>
  );
}
