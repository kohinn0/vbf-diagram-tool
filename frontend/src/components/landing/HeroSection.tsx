export function HeroSection() {
  return (
    <section className="relative bg-[var(--bg-main)] pt-20 pb-16 lg:pt-36 lg:pb-32 border-b-2 border-[var(--border-color)] overflow-hidden">
      {/* Background glowing gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-green-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-16 items-center">
        
        {/* Tartalmi rész */}
        <div className="space-y-8 z-10">
          <div className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-[color:var(--accent)]/25 bg-[color:var(--accent)]/10 px-4 py-1.5 text-sm font-bold text-[color:var(--accent)] shadow-sm backdrop-blur-sm">
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13 2 3 14h7v8l11-12h-7l5-8z"/></svg>
            <span>VBF-szakértő fejlesztette – szakembereknek</span>
          </div>
          
          <h1 className="text-balance text-5xl font-bold leading-[1.12] tracking-tight text-[var(--text-main)] lg:text-6xl">
            Villamos biztonsági felülvizsgálat.<br/>
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">Gyorsabban, pontosabban.</span>
          </h1>
          
          <p className="text-xl text-[var(--text-muted-strong)] max-w-2xl leading-relaxed">
            A programot VBF-szakértő fejlesztette – aki maga is terepen dolgozik. Szakembertől szakembereknek.
          </p>

          <ul className="space-y-4 text-[var(--text-muted-strong)] font-medium">
            <li className="flex gap-3 items-start">
              <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">✓</span>
              <span><strong>Minden egy helyen:</strong> VBF/EPH, rajzkészítő, PADFX beolvasás, automatikus hibajegyzék.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="mt-1 flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">✓</span>
              <span><strong>Szabványos és hiteles:</strong> MSZ, TvMI, saját logó, Word/PDF export, QR-kód.</span>
            </li>
          </ul>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <a href="#pricing" className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-xl font-bold text-center transition-all shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1">
              Előfizetés megrendelése
            </a>
            <button 
              onClick={() => (document.getElementById('loginModal') as HTMLDialogElement)?.showModal()}
              className="bg-[var(--bg-card)]/80 backdrop-blur-md hover:bg-[var(--bg-input)] text-[var(--text-main)] border border-[var(--border-color)] px-8 py-4 rounded-xl font-bold text-center transition-all hover:shadow-md hover:-translate-y-1"
            >
              Ingyenes Demó (Belépés)
            </button>
          </div>
        </div>

        {/* Grafika rész (Hero Graphics) */}
        <div className="relative mx-auto w-full max-w-lg lg:max-w-none z-10 group perspective-1000">
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/30 to-sky-500/30 blur-[80px] transition-transform duration-700 group-hover:scale-110"></div>
          
          <div className="relative flex flex-col gap-8 overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)]/85 p-8 shadow-[var(--shadow-premium)] ring-1 ring-white/[0.06] backdrop-blur-xl transition-all duration-500 hover:rotate-[0.5deg] hover:scale-[1.01] sm:p-10">
            {/* Dekorációs kábel/rajz */}
            <div className="relative h-28 sm:h-36 w-full rounded-xl bg-[var(--bg-input)] border border-[var(--border-color)] p-5 flex items-center justify-between overflow-hidden shadow-inner">
              <div className="absolute inset-x-0 h-[2px] top-1/2 -translate-y-1/2 overflow-hidden bg-[var(--border-color)]">
                 <div className="w-[150%] h-full bg-gradient-to-r from-transparent via-primary to-transparent animate-[slide_2s_linear_infinite] opacity-70"></div>
              </div>
              
              {/* Fake kismegszakítók 3D stílussal */}
              <div className="relative z-10 w-14 sm:w-20 h-20 sm:h-24 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1">
                <div className="w-full h-3 border-b border-[var(--border-color)] absolute top-0 rounded-t-lg"></div>
                <div className="w-2 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
              <div className="relative z-10 w-14 sm:w-20 h-20 sm:h-24 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg shadow-lg flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1 delay-75">
                <div className="w-full h-3 border-b border-[var(--border-color)] absolute top-0 rounded-t-lg"></div>
                <div className="h-6 w-2 rounded-full bg-primary shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
              </div>
              <div className="relative z-10 w-14 sm:w-20 h-20 sm:h-24 bg-yellow-900/20 border border-yellow-700/50 rounded-lg shadow-lg flex flex-col items-center justify-center transform transition-transform hover:-translate-y-1 delay-150">
                <div className="w-full h-3 border-b border-yellow-900/30 absolute top-0 rounded-t-lg"></div>
                <div className="w-2 h-6 bg-yellow-500 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.5)] animate-pulse"></div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h3 className="text-3xl font-extrabold text-[var(--text-main)] tracking-tight">VBF · EPH Jegyzőkönyv</h3>
              <p className="text-[var(--text-muted-strong)] text-base font-medium">MSZ HD 60364 · OTSZ · ÁVK · Szigetelés</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="rounded-md border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 shadow-sm backdrop-blur">Saját logó</span>
                <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-sky-300 shadow-sm backdrop-blur">Szakértői motor</span>
                <span className="bg-primary/10 text-primary px-3 py-1.5 rounded-md text-xs font-bold border border-primary/20 shadow-sm backdrop-blur">Gyors Generálás</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
