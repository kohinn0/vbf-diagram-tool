import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      // Mock login logic, we just redirect to app in this phase
      const modal = document.getElementById('loginModal') as HTMLDialogElement;
      modal?.close();
      navigate('/app/report');
    }
  };

  const close = () => {
    const modal = document.getElementById('loginModal') as HTMLDialogElement;
    modal?.close();
  };

  return (
    <dialog id="loginModal" className="modal bg-transparent p-0 m-auto mt-[10vh] max-w-none backdrop:bg-black/60 relative">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in relative z-50">
        
        {/* Glow decoration */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
        
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--text-main)] to-gray-500">Bejelentkezés</h2>
            <p className="text-sm text-[var(--text-muted)] font-medium">Lépj be a VBF Premium fiókodba</p>
          </div>
          <button 
            type="button" 
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-[var(--bg-input)] hover:text-[var(--text-main)] transition-colors"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-[var(--text-muted-strong)]">E-mail cím</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-shadow transition-colors" 
                placeholder="pelda@ceg.hu" 
              />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-[var(--text-muted-strong)]">Jelszó</label>
                <a href="#" className="text-xs font-semibold text-primary hover:underline">Elfelejtetted?</a>
              </div>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-shadow transition-colors" 
                placeholder="••••••••" 
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-primary/30 mt-2"
            >
              Belépés a rendszerbe
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm font-medium text-[var(--text-muted)]">
            Nincs még fiókod? <a href="#pricing" onClick={close} className="text-primary hover:underline font-bold">Vásárolj előfizetést!</a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
