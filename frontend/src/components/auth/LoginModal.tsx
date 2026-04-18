import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithPassword, requestPasswordReset } from '../../lib/api';
import { toast } from '../../lib/toast';

export function LoginModal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const close = () => {
    const modal = document.getElementById('loginModal') as HTMLDialogElement;
    modal?.close();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error('Add meg a felhasználónevet és a jelszót.');
      return;
    }
    setLoading(true);
    try {
      const data = await loginWithPassword(username.trim(), password);
      localStorage.setItem('vbf_token', data.access_token);
      window.dispatchEvent(new Event('vbf-token-changed'));
      close();
      setPassword('');
      toast.success('Sikeres bejelentkezés.');
      navigate('/app/dashboard');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Bejelentkezés sikertelen.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    const email = window.prompt(
      'Add meg a fiókod e-mail címét — ha van SMTP beállítás, a backend küld reset linket (ellenőrizd a levélszemét is).'
    );
    if (!email?.trim()) return;
    try {
      const r = await requestPasswordReset(email.trim());
      toast.success(r.message || 'Kérés rögzítve.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Kérés sikertelen.');
    }
  };

  return (
    <dialog id="loginModal" className="modal bg-transparent p-0 m-auto mt-[10vh] max-w-none backdrop:bg-black/60 relative">
      <div className="relative z-50 w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-main)] shadow-[var(--shadow-premium)] ring-1 ring-white/[0.08] animate-fade-in backdrop-blur-sm">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex flex-col">
            <h2 className="bg-gradient-to-r from-[var(--text-main)] to-[var(--text-muted)] bg-clip-text text-2xl font-bold text-transparent">
              Bejelentkezés
            </h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">Biztonságos belépés a felületre</p>
          </div>
          <button
            type="button"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-input)] hover:text-[var(--text-main)]"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--text-muted-strong)]">Felhasználónév</label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                className="w-full min-h-11 px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-shadow transition-colors"
                placeholder="pl. admin vagy kovacs"
              />
              <p className="text-xs text-[var(--text-muted)]">A backend a felhasználónevet használja (nem az e-mail címet).</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--text-muted-strong)]">Jelszó</label>
                <button
                  type="button"
                  onClick={handleForgot}
                  className="text-xs font-semibold text-primary hover:underline min-h-11 py-1"
                >
                  Elfelejtetted?
                </button>
              </div>
              <input
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                autoComplete="current-password"
                className="w-full min-h-11 px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-shadow transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-11 bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-primary/30 mt-2 disabled:opacity-60"
            >
              {loading ? 'Belépés…' : 'Belépés a rendszerbe'}
            </button>
          </form>

          <div className="mt-8 text-center text-sm font-medium text-[var(--text-muted)]">
            Nincs még fiókod?{' '}
            <a href="#pricing" onClick={close} className="text-primary hover:underline font-bold">
              Vásárolj előfizetést!
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
