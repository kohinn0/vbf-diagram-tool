export function ExpertsSection() {
  return (
    <section id="experts" className="relative py-24 bg-[var(--bg-card)] border-y border-[var(--border-color)] overflow-hidden">
      {/* Background decoration */}
      <div className="absolute right-[-5%] top-[20%] w-[400px] h-[400px] bg-primary/8 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-input)] text-[var(--text-muted-strong)] px-4 py-1.5 rounded-full text-sm font-bold border border-[var(--border-color)] shadow-sm">
            Minősített szakemberek
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight">Szakemberkereső</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Villamos biztonsági (VBF), EPH és villámvédelem (VVF) szolgáltató szakemberek.
          </p>
          <p className="text-[var(--text-muted-strong)] text-base leading-relaxed">
            Minősített VBF és EPH szakemberek – ha vizsgálatra vagy jegyzőkönyvre van szükséged, fordulj hozzájuk. Szakemberként megjelenni szeretnél? Írj nekünk a feltételekért.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Expert Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-tr from-primary/30 to-blue-500/20 rounded-3xl blur opacity-0 group-hover:opacity-70 transition duration-500"></div>
            <div className="relative bg-[var(--bg-main)] border border-[var(--border-color)] p-8 rounded-3xl flex flex-col items-center text-center shadow-sm hover:shadow-xl hover:border-primary/40 transition-all duration-300 hover:-translate-y-1">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-primary to-blue-500 text-white rounded-full flex items-center justify-center text-3xl font-extrabold shadow-lg shadow-primary/30 border-4 border-[var(--bg-card)]">
                  SZ
                </div>
              </div>
              <h3 className="text-xl font-bold text-[var(--text-main)] mb-1">Szikora Zoltán</h3>
              <p className="text-primary font-bold text-sm mb-4 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">VBF · EPH szakértő</p>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6 font-medium">
                Villamos biztonsági (VBF) és EPH felülvizsgálatok, vizsgabizonyítványok. A VBF Premium fejlesztője – szakembertől szakembereknek.
              </p>
              <a href="mailto:info@vbfpremium.hu" className="inline-flex items-center gap-2 border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-primary hover:text-white hover:border-primary text-[var(--text-main)] font-semibold py-2.5 px-5 rounded-xl transition-all duration-300 text-sm shadow-sm">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Kapcsolat
              </a>
            </div>
          </div>

          {/* Placeholder slot */}
          <div className="bg-[var(--bg-input)]/40 border-2 border-dashed border-[var(--border-color)] p-8 rounded-3xl flex flex-col items-center justify-center text-center opacity-60 hover:opacity-100 transition-opacity">
            <div className="w-20 h-20 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full mb-5 flex items-center justify-center text-[var(--text-muted)] shadow-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <h3 className="text-lg font-bold text-[var(--text-muted-strong)] mb-2">Te is itt lehetsz</h3>
            <p className="text-[var(--text-muted)] text-sm font-medium">Villamos szakemberként regisztrálj a listára.</p>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-[var(--text-muted-strong)] font-medium bg-[var(--bg-main)] border border-[var(--border-color)] inline-flex px-6 py-3 rounded-full shadow-sm">
            Szakemberként megjelenni szeretnél? <a href="mailto:info@vbfpremium.hu" className="text-primary font-extrabold hover:underline ml-2">info@vbfpremium.hu</a>
          </p>
        </div>
      </div>
    </section>
  );
}
