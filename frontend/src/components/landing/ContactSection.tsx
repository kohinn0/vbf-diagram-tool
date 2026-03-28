export function ContactSection() {
  return (
    <section id="contact" className="relative py-24 bg-[var(--bg-card)] border-t-2 border-[var(--border-color)] overflow-hidden">
      {/* Glows */}
      <div className="absolute bottom-0 left-[-10%] w-[500px] h-[400px] bg-primary/8 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold border border-primary/20 shadow-sm">
            Írj nekünk
          </div>
          <h2 className="text-4xl lg:text-5xl font-extrabold text-[var(--text-main)] tracking-tight">Kapcsolat</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Egyedi ár, partnerség, szakemberi megjelenés vagy bármilyen kérdés: írj nekünk bizalommal.
          </p>
          <p className="text-[var(--text-muted-strong)] text-base leading-relaxed">
            Egyedi árazást kérsz nagyobb csomaghoz? Szeretnél partnerként megjelenni az oldalunkon? Szakemberként hirdetnéd magad villamos biztonsági (VBF), EPH vagy villámvédelem (VVF) szolgáltatással? Bármilyen kérdésed van, írd meg az üzenetben – válaszolunk 1–2 munkanapon belül.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto items-start">
          {/* Contact Info */}
          <div className="space-y-6">
            <div className="flex items-start gap-5 p-6 bg-[var(--bg-card)]/80 backdrop-blur border border-[var(--border-color)] rounded-2xl hover:border-primary/30 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-muted)] mb-1">E-mail</p>
                <a href="mailto:info@vbfpremium.hu" className="text-xl font-bold text-[var(--text-main)] hover:text-primary transition-colors">info@vbfpremium.hu</a>
              </div>
            </div>

            <div className="flex items-start gap-5 p-6 bg-[var(--bg-card)]/80 backdrop-blur border border-[var(--border-color)] rounded-2xl hover:border-primary/30 transition-colors group">
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.23 2 2 0 0 1 3.63 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.49A16 16 0 0 0 16 16.59l.87-.87a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-muted)] mb-1">Telefon</p>
                <a href="tel:+36303419594" className="text-xl font-bold text-[var(--text-main)] hover:text-primary transition-colors">+36 30 341 9594</a>
              </div>
            </div>

            <div className="flex items-start gap-5 p-6 bg-[var(--bg-card)]/80 backdrop-blur border border-[var(--border-color)] rounded-2xl hover:border-pink-500/30 transition-colors group">
              <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-muted)] mb-1">Instagram</p>
                <a href="https://instagram.com/vbfpremium" target="_blank" rel="noopener noreferrer" className="text-xl font-bold text-[var(--text-main)] hover:text-pink-500 transition-colors">@vbfpremium</a>
                <p className="text-sm text-[var(--text-muted)] mt-1">Hírek és tippek</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-3xl blur-md opacity-60 pointer-events-none"></div>
            <div className="relative bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] p-8 sm:p-10 rounded-3xl shadow-2xl">
              <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); alert('Üzenet elküldve (Demó)!'); }}>
                <div className="flex flex-col gap-2">
                  <label htmlFor="contactName" className="text-sm font-bold text-[var(--text-main)]">Név *</label>
                  <input type="text" id="contactName" required placeholder="Kovács János" className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]" />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="contactEmail" className="text-sm font-bold text-[var(--text-main)]">E-mail *</label>
                  <input type="email" id="contactEmail" required placeholder="pelda@ceg.hu" className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]" />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="contactCompany" className="text-sm font-bold text-[var(--text-main)]">Cég (opcionális)</label>
                  <input type="text" id="contactCompany" placeholder="Zöldfülű Kft." className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all placeholder:text-[var(--text-muted)]" />
                </div>

                <div className="flex flex-col gap-2">
                  <label htmlFor="contactMessage" className="text-sm font-bold text-[var(--text-main)]">Üzenet *</label>
                  <textarea id="contactMessage" required rows={4} placeholder="Kérem a céges ajánlatot…" className="w-full p-3.5 border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-main)] rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all resize-y placeholder:text-[var(--text-muted)]"></textarea>
                </div>

                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0">
                  Üzenet küldése →
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
