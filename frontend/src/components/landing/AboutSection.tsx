export function AboutSection() {
  return (
    <section id="about" className="relative py-24 bg-[var(--bg-card)] border-t-2 border-[var(--border-color)] overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-0 right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Column: Story & Quote */}
          <div className="space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 bg-[var(--bg-card)]/80 backdrop-blur px-4 py-2 rounded-full border border-[var(--border-color)] text-sm font-bold text-[var(--text-muted-strong)] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              A VBF Premium Története
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight leading-tight">
              Szakembertől <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">szakembereknek.</span>
            </h2>

            <div className="relative p-6 sm:p-8 bg-[var(--bg-card)]/50 backdrop-blur-md border l border-[var(--border-color)] rounded-2xl border-l-4 border-l-primary shadow-lg">
              <svg className="absolute top-4 right-4 w-12 h-12 text-primary/10" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/></svg>
              <p className="text-lg text-[var(--text-muted-strong)] leading-relaxed relative z-10 font-medium italic">
                „Tudjuk, milyen időrabló, ha mérésről mérésre Excelbe vagy Wordbe gépelsz, otthon összerakod a képeket, kézzel utánanézel a szabványoknak – miközben a következő vizsgálat már vár. Én magam is ezt csináltam – ezért vágtam bele a fejlesztésbe.”
              </p>
            </div>
            
            <div className="pt-4">
              <a href="#contact" className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-4 px-8 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1">
                Kapcsolatfelvétel
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
            </div>
          </div>

          {/* Right Column: Key Focus */}
          <div className="relative group perspective-1000">
            <div className="absolute -inset-1 bg-gradient-to-tr from-primary/30 to-blue-500/30 rounded-3xl blur-md opacity-50 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] p-8 sm:p-10 rounded-3xl shadow-2xl flex flex-col gap-6 transform transition-all duration-500 hover:rotate-1 hover:scale-[1.02]">
              
              <div className="w-16 h-16 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20 shadow-inner">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </div>

              <h3 className="text-2xl font-bold text-[var(--text-main)] leading-snug">Magyar fejlesztés,<br/>terepi gyakorlatból született</h3>
              
              <div className="space-y-4">
                <p className="text-[var(--text-muted-strong)] leading-relaxed">
                  Innen indult a VBF Premium: egy olyan villamos biztonsági jegyzőkönyv-szoftver, ami rengeteg órát spórol, mindent egy helyen tart – mérésekkel, szabványokkal, dokumentumokkal.
                </p>
                
                <div className="bg-[var(--bg-input)] rounded-xl p-4 border border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold">100%</div>
                    <div>
                      <h4 className="font-bold text-[var(--text-main)] text-sm">Célirányos fejlesztés</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">Nincsenek felesleges gombok, csak ami a VBF-hez kell.</p>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
