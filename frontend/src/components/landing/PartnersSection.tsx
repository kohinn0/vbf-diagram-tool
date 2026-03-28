export function PartnersSection() {
  return (
    <section id="partners" className="relative py-24 bg-[var(--bg-main)] overflow-hidden">
      {/* Background decorations */}
      <div className="absolute left-[-10%] top-[20%] w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-500/20 mb-2 shadow-sm">
            Kik használják?
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight">Együttműködő partnereink</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Cégek és szolgáltatók, akik a VBF Premium megoldást használják vagy támogatják. 
            Ha te is szeretnél partner lenni – cégként vagy területi képviselőként –, írj nekünk.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Partner 1 */}
          <a href="https://vizvillanyfutes.hu/" target="_blank" rel="noopener noreferrer" className="relative group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-blue-500/10 rounded-3xl blur-md opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <div className="relative block bg-[var(--bg-card)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 sm:p-10 rounded-3xl hover:border-primary/50 hover:shadow-2xl transition-all duration-300 transform group-hover:-translate-y-1">
              <div className="mb-8 h-16 flex items-center justify-start">
                <img src="https://vizvillanyfutes.hu/wp-content/uploads/2024/10/vizvillanyfutes-logo.png" alt="VízVillanyFűtés" className="max-h-12 w-auto opacity-80 group-hover:opacity-100 transition-opacity filter grayscale group-hover:grayscale-0 duration-500" />
              </div>
              <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3">VízVillanyFűtés</h3>
              <p className="text-[var(--text-muted)] text-[15px] leading-relaxed mb-8 font-medium">
                Szakiközvetítő portál Budapesten és Pest megyében: víz-, villany- és fűtésszerelők egy helyen. Munkát adsz fel, az ellenőrzött szakemberek ajánlatot adnak – akár sürgősségi ügyben is. Örülünk, hogy partnereink között vannak.
              </p>
              <div className="inline-flex items-center gap-2 text-primary font-bold bg-primary/10 px-4 py-2 rounded-xl group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                Weboldal megtekintése
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </div>
            </div>
          </a>

          {/* Placeholder Partner */}
          <div className="bg-[var(--bg-input)]/50 backdrop-blur border-2 border-dashed border-[var(--border-color)] p-8 sm:p-10 rounded-3xl flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
            <div className="w-20 h-20 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-full mb-6 flex items-center justify-center text-[var(--text-muted)] shadow-inner">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-muted-strong)] mb-2">Partner cég</h3>
            <p className="text-[var(--text-muted)] text-sm font-medium">Ide kerülnek további együttműködő cégek logói és nevei.</p>
          </div>
        </div>

        <div className="text-center mt-16">
          <p className="text-[var(--text-muted-strong)] font-medium bg-[var(--bg-card)] border border-[var(--border-color)] inline-flex px-6 py-3 rounded-full shadow-sm">
            Partner lenni szeretnél? <a href="mailto:info@vbfpremium.hu" className="text-primary font-extrabold hover:underline ml-2">info@vbfpremium.hu</a>
          </p>
        </div>
      </div>
    </section>
  );
}
