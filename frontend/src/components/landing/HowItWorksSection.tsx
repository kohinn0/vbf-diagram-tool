export function HowItWorksSection() {
  const steps = [
    {
      num: "1",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
      title: "Csomag kiválasztása",
      desc: "Regisztráció, csomag kiválasztása, utalásos számla – a hozzáférés aktiválása után azonnal dolgozhatsz."
    },
    {
      num: "2",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
      title: "Munkakiosztás",
      desc: "A céges vezető kiosztja a villamos biztonsági vizsgálatokat a technikusoknak a beépített naptárban."
    },
    {
      num: "3",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>,
      title: "Terepi munka",
      desc: "Mérések, PADFX import, elosztó rajz, hibajegyzék – tableten is, akár offline a helyszínen."
    },
    {
      num: "4",
      icon: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
      title: "Kész jegyzőkönyv",
      desc: "Egy kattintással kész a szabványos Word jegyzőkönyv és az aláírt PDF dokumentum."
    }
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-[var(--bg-card)] border-y border-[var(--border-color)] overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--text-main) 1px, transparent 1px), linear-gradient(90deg, var(--text-main) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20 mb-2 shadow-sm">
            Négy egyszerű lépés
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight">Hogyan működik?</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Az előfizetés kiválasztásától a kész, aláírt jegyzőkönyvig – mindössze négy lépésben.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Faint connecting line for large screens */}
          <div className="hidden lg:block absolute top-[45px] left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>

          {steps.map((step, idx) => (
            <div key={idx} className="relative bg-[var(--bg-main)]/80 backdrop-blur-sm border border-[var(--border-color)] p-8 rounded-3xl hover:border-primary/50 hover:shadow-[0_0_30px_rgba(var(--color-primary),0.15)] transition-all duration-300 hover:-translate-y-2 group z-10 flex flex-col items-center text-center">
              
              <div className="relative mb-8 mt-2">
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl group-hover:bg-primary/40 transition-colors duration-300"></div>
                <div className="relative w-20 h-20 bg-[var(--bg-card)] border-2 border-[var(--border-color)] group-hover:border-primary text-[var(--text-main)] rounded-2xl flex items-center justify-center transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110 shadow-xl">
                  {step.icon}
                  <div className="absolute -top-3 -right-3 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg shadow-primary/40 border-2 border-[var(--bg-card)]">
                    {step.num}
                  </div>
                </div>
              </div>

              <h4 className="text-xl font-bold text-[var(--text-main)] mb-4">{step.title}</h4>
              <p className="text-[var(--text-muted)] text-[15px] leading-relaxed font-medium">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
