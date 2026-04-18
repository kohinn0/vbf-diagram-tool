export function FeaturesSection() {
  const features = [
    {
      title: "Egyvonalas Rajzoló",
      desc: "Elosztó rajz tabletről vagy gépről: kismegszakítók, ÁVK-k behúzása, egy kattintás és bekerül a jegyzőkönyvbe.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
    },
    {
      title: "Műszer adat import",
      desc: "PADFX és CSV/TXT fájlok feltöltése – a mérések automatikusan bekerülnek a táblázatba, a hibás értékek kiemelődnek.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M12 22v-6"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><rect x="7" y="8" width="10" height="10" rx="1"/><path d="M10 12h4M10 15h4"/></svg>
    },
    {
      title: "Automatikus hibajegyzék",
      desc: "Ha a hurok-, szigetelés- vagy RCD teszt nem felel meg, egy gombnyomásra szabványos hibaleírás kerül a hibajegyzékbe.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M12 10V7M9 7h6"/><circle cx="9" cy="15" r="1" fill="currentColor"/><circle cx="15" cy="15" r="1" fill="currentColor"/></svg>
    },
    {
      title: "Saját céges arculat",
      desc: "Logó, céges adatok és aláírás az Admin panelen – minden generált dokumentum a te megjelenésedben készül.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><path d="M6 22V8l6-4 6 4v14"/><path d="M10 22V12h4v10"/></svg>
    },
    {
      title: "QR kód az elosztón",
      desc: "QR kód az elosztóra – legközelebbi karbantartáskor leolvasod, és azonnal betölti a korábbi mérési eredményeket.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="6" y="3" width="12" height="18" rx="2"/><path d="M10 18h4"/></svg>
    },
    {
      title: "Munkakiosztás",
      desc: "Feladatok kiosztása a technikusoknak; minden munkához ICS naptárbejegyzés megy e-mailben.",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
    },
    {
      title: "Villámvédelem (LPS)",
      desc: "Villámhárító mérések rögzítése – felfogók, levezetők, földelés. A VVF modul bővül.",
      icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-yellow-500"><path d="M13 2 3 14h7v8l11-12h-7l5-8z"/></svg>
    },
    {
      title: "Speciális Berendezések",
      desc: "PV DC távlekapcsoló, autótöltő RCD, Túlfeszültség (SPD) és Ívhiba (AFDD) védelem vizsgálata (MSZ HD 60364).",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-yellow-500"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M12 3v8"/><path d="M10 3h4"/><path d="M10 7h4"/></svg>
    }
  ];

  return (
    <section id="features" className="relative py-24 bg-[var(--bg-main)] overflow-hidden">
      {/* Background decoration */}
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[100px]"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
            Funkciók
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight">VBF és EPH jegyzőkönyv – minden egy helyen</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            A VBF Premium az MSZ HD 60364-6, TvMI 7 és OTSZ szerinti sablonokkal dolgozik – villamos szakembereknek tervezve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-[var(--bg-card)]/80 backdrop-blur-sm border border-[var(--border-color)] p-8 rounded-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 group relative overflow-hidden">
              {/* Card Hover Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
              
              <div className="relative w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-xl mb-6 group-hover:bg-primary group-hover:text-white group-hover:scale-110 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(var(--color-primary),0.4)]">
                {feature.icon}
              </div>
              <h3 className="relative text-[1.2rem] font-bold text-[var(--text-main)] mb-3">{feature.title}</h3>
              <p className="relative text-[var(--text-muted)] text-sm leading-relaxed font-medium">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
