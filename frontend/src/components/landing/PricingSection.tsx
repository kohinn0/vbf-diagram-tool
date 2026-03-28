import { useCartStore } from '../../store/cartStore';

export function PricingSection() {
  const { addItem } = useCartStore();

  const handleBuy = (id: string, title: string, price: number) => {
    addItem({ id, title, price });
  };

  return (
    <section id="pricing" className="relative py-24 bg-[var(--bg-card)] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20 shadow-sm mb-2">
            Átlátható árak
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight">Árak és előfizetés</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Válaszd ki a neked való jegyzőkönyv-előfizetést – átláthatóan, rejtett költségek nélkül.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-center pt-6">
          {/* Havi csomag */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--bg-main)] rounded-bl-full -z-10 group-hover:scale-110 transition-transform"></div>
            <h3 className="text-2xl font-bold text-[var(--text-muted-strong)] mb-2">Havi előfizetés</h3>
            <div className="text-5xl font-extrabold text-[var(--text-main)] mb-1 tracking-tight">12.990 <span className="text-2xl font-medium text-[var(--text-muted)]">Ft</span></div>
            <p className="text-sm text-[var(--text-muted)] mb-10 font-medium">Havonta számlázva</p>
            
            <ul className="w-full space-y-5 mb-10 text-[var(--text-main)] text-[15px]">
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Havonta max. 15 jegyzőkönyv</li>
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Rajzoló eszköz használata</li>
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Alap sablonok elérése</li>
              <li className="flex items-start gap-4 text-gray-500"><span className="font-bold bg-[var(--bg-main)] p-1 rounded-full text-xs">✖</span> Auto-Hibagenerálás</li>
              <li className="flex items-start gap-4 text-gray-500"><span className="font-bold bg-[var(--bg-main)] p-1 rounded-full text-xs">✖</span> Saját céges logó használata</li>
            </ul>

            <button 
              onClick={() => handleBuy('monthly', 'Havi előfizetés', 12990)}
              className="mt-auto w-full bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-main)] font-bold py-4 px-6 rounded-xl transition-all hover:shadow-md"
            >
              Kosárba
            </button>
          </div>

          {/* Éves csomag (Kiemelt) */}
          <div className="relative lg:-translate-y-6 z-10 transform transition-all duration-300 hover:-translate-y-8">
            {/* Badge OUTSIDE the card so overflow-hidden doesn't clip it */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-[0_4px_14px_0_rgba(234,179,8,0.39)] text-white px-5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-yellow-400 whitespace-nowrap">
              Legnépszerűbb
            </div>

            <div className="bg-[var(--bg-card)] border-2 border-primary rounded-3xl p-8 lg:p-10 shadow-2xl flex flex-col items-center relative overflow-hidden group hover:shadow-primary/20 transition-all duration-300">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-400 via-primary to-yellow-400"></div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors"></div>

              <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600 mb-2 mt-4">Éves előfizetés</h3>
              <div className="text-6xl font-black text-[var(--text-main)] mb-1 tracking-tight">99.000 <span className="text-2xl font-medium text-[var(--text-muted)]">Ft</span></div>
              <p className="text-sm text-primary mb-10 font-bold bg-primary/10 px-3 py-1 rounded-full">Évente számlázva (2 hónap ajándék)</p>

              <ul className="w-full space-y-5 mb-10 text-[var(--text-main)] text-[15px] font-medium">
                <li className="flex items-start gap-4"><span className="text-white font-bold bg-green-500 p-1 rounded-full text-xs shadow-sm">✓</span> Korlátlan jegyzőkönyv és rajz</li>
                <li className="flex items-start gap-4"><span className="text-white font-bold bg-green-500 p-1 rounded-full text-xs shadow-sm">✓</span> <strong>Saját logó és céges adatok</strong></li>
                <li className="flex items-start gap-4"><span className="text-white font-bold bg-green-500 p-1 rounded-full text-xs shadow-sm">✓</span> Metrel (PADFX) import</li>
                <li className="flex items-start gap-4"><span className="text-white font-bold bg-green-500 p-1 rounded-full text-xs shadow-sm">✓</span> Automatikus hibajegyzék</li>
                <li className="flex items-start gap-4"><span className="text-white font-bold bg-green-500 p-1 rounded-full text-xs shadow-sm">✓</span> Munkakiosztás és naptár</li>
              </ul>

              <button
                onClick={() => handleBuy('yearly', 'Éves előfizetés', 99000)}
                className="mt-auto w-full relative bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(59,130,246,0.39)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.23)] hover:-translate-y-0.5"
              >
                Éves csomag kosárba
              </button>
            </div>
          </div>

          {/* Céges csomag */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col items-center group relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-[var(--bg-main)] rounded-tr-full -z-10 group-hover:scale-110 transition-transform"></div>
            <h3 className="text-2xl font-bold text-[var(--text-muted-strong)] mb-2">Céges / Egyedi</h3>
            <div className="text-4xl font-extrabold text-[var(--text-main)] mb-1 text-center leading-tight py-2">Egyedi<br/>árazás</div>
            <p className="text-sm text-[var(--text-muted)] mt-2 mb-10 font-medium">Szerződéskötés nagycsomagra</p>
            
            <ul className="w-full space-y-5 mb-10 text-[var(--text-main)] text-[15px] flex-1">
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Korlátlan felhasználó</li>
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Dedikált kiemelt támogatás</li>
              <li className="flex items-start gap-4"><span className="text-green-500 font-bold bg-green-500/10 p-1 rounded-full text-xs">✓</span> Egyedi sablonok, integráció</li>
            </ul>

            <a 
              href="#contact"
              className="mt-auto w-full text-center bg-[var(--bg-input)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-main)] font-bold py-4 px-6 rounded-xl transition-all hover:shadow-md block"
            >
              Kapcsolatfelvétel
            </a>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto mt-16 p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center text-blue-400">
          <p className="font-medium flex items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            Visszajelzés a béta verzió során: Ha bármilyen hibát tapasztalsz, jelezd felénk és azonnal javítjuk!
          </p>
        </div>
      </div>
    </section>
  );
}
