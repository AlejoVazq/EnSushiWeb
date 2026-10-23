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
    <form className="center panel" onSubmit={submit}>
      <h1>EnSushi Local</h1>
      <label htmlFor="user">Usuario</label>
      <input id="user" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
      <label htmlFor="pass">Contraseña</label>
      <input id="pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="error">{error}</p>}
      <p className="row">
        <button type="submit" className="primary" disabled={busy || !username || !password}>
          {busy ? 'Ingresando…' : 'Ingresar'}
        </button>
        <button type="button" onClick={onSettings}>
          Ajustes
        </button>
      </p>
    </form>
  );
}
