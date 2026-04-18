import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { legalUrls } from '../lib/legalUrls';
import { HeroSection } from '../components/landing/HeroSection';
import { FeaturesSection } from '../components/landing/FeaturesSection';
import { PricingSection } from '../components/landing/PricingSection';
import { CartDrawer } from '../components/landing/CartDrawer';
import { AboutSection } from '../components/landing/AboutSection';
import { HowItWorksSection } from '../components/landing/HowItWorksSection';
import { PartnersSection } from '../components/landing/PartnersSection';
import { ExpertsSection } from '../components/landing/ExpertsSection';
import { FaqSection } from '../components/landing/FaqSection';
import { ContactSection } from '../components/landing/ContactSection';
import { LoginModal } from '../components/auth/LoginModal';

export default function Landing() {
  const { items, openCart } = useCartStore();
  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="min-h-screen font-sans bg-[var(--bg-main)] text-[var(--text-main)] w-full overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-white/[0.08] bg-[var(--bg-card)]/75 px-4 shadow-[var(--shadow-premium-sm)] backdrop-blur-xl backdrop-saturate-150 sm:h-20 sm:px-8">
        <div className="flex cursor-pointer items-center gap-3" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-sky-600 text-[11px] font-extrabold text-white shadow-[0_4px_16px_rgba(59,130,246,0.4)] ring-1 ring-white/15 sm:h-11 sm:w-11 sm:text-xs">
            VBF
          </div>
          <span className="hidden text-xl font-semibold tracking-tight text-[var(--text-main)] sm:block">VBF Premium</span>
        </div>
        
        <div className="hidden items-center gap-1 font-medium text-[var(--text-muted-strong)] lg:flex">
          <a href="#features" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Funkciók</a>
          <a href="#about" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Rólunk</a>
          <a href="#how-it-works" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Működés</a>
          <a href="#pricing" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Árak és Vásárlás</a>
          <a href="#partners" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Partnereink</a>
          <a href="#experts" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Szakemberkereső</a>
          <a href="#faq" className="rounded-lg px-3 py-2 transition-all duration-200 hover:bg-white/[0.05] hover:text-primary">Gyakori kérdések</a>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/status"
            className="rounded-lg px-2 py-2 text-sm font-semibold text-[var(--text-muted-strong)] transition-colors hover:text-primary lg:hidden min-h-11 inline-flex items-center"
          >
            Állapot
          </Link>
          <button 
            type="button" 
            onClick={openCart} 
            className="relative p-2 text-[var(--text-muted-strong)] hover:text-primary transition-colors group"
            aria-label="Kosár"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {cartItemCount > 0 && (
              <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                {cartItemCount}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => (document.getElementById('loginModal') as HTMLDialogElement)?.showModal()}
            className="hidden rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] px-5 py-2.5 font-semibold text-[var(--text-main)] shadow-sm transition-all duration-200 hover:bg-[var(--bg-card)] hover:shadow-md focus:ring-2 focus:ring-primary/25 sm:block"
          >
            Bejelentkezés
          </button>
          <a href="#pricing" className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white shadow-[0_4px_22px_rgba(59,130,246,0.4)] transition-all duration-200 hover:bg-primary-hover hover:shadow-[0_6px_28px_rgba(59,130,246,0.5)] hover:-translate-y-0.5 active:translate-y-0">
            Vásárlás
          </a>
        </div>
      </nav>

      {/* Főoldal Szekciók */}
      <main className="w-full">
        <HeroSection />
        <AboutSection />
        <HowItWorksSection />
        <FeaturesSection />
        <PricingSection />
        <PartnersSection />
        <ExpertsSection />
        <FaqSection />
        <ContactSection />
      </main>

      <LoginModal />
      <CartDrawer />
      
      {/* Részletes Footer az eredeti HTML alapján */}
      <footer className="bg-[var(--bg-card)] border-t border-[var(--border-color)] pt-16 pb-8 px-4 sm:px-6 lg:px-8 mt-20 text-[var(--text-main)] transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Oszlop 1: Logo & Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center text-white font-extrabold shadow-sm">
                VBF
              </div>
              <span className="font-bold text-xl">VBF Premium</span>
            </div>
            <p className="text-sm text-[var(--text-muted-strong)] leading-relaxed">
              VBF Premium – magyar villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyv szoftver. VBF szakértő készítette – szakembertől szakembereknek. MSZ HD 60364, OTSZ szerinti sablonok, elosztó rajz, Metrel PADFX import, hibajegyzék, munkakiosztás. Magyar fejlesztés, felhőalapú.
            </p>
            <div className="pt-2 flex flex-col gap-1 text-sm font-semibold">
              <a href="mailto:info@vbfpremium.hu" className="text-primary hover:underline">info@vbfpremium.hu</a>
              <a href="tel:+36303419594" className="text-primary hover:underline">+36 30 341 9594</a>
            </div>
            <div className="pt-4">
              <div className="text-sm font-bold mb-3">Kövess minket</div>
              <a href="https://instagram.com/vbfpremium" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--text-muted)] hover:text-primary transition-colors text-sm font-semibold">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                Instagram
              </a>
            </div>
          </div>

          {/* Oszlop 2: Termék */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[var(--text-main)]">Termék</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li><a href="#features" className="hover:text-primary transition-colors">Funkciók</a></li>
              <li><a href="#pricing" className="hover:text-primary transition-colors">Árak és Vásárlás</a></li>
              <li><a href="#partners" className="hover:text-primary transition-colors">Partnereink</a></li>
              <li><a href="#experts" className="hover:text-primary transition-colors">Szakemberkereső</a></li>
            </ul>
          </div>

          {/* Oszlop 3: Támogatás */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[var(--text-main)]">Támogatás</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li>
                <Link to="/status" className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  Rendszer állapot
                </Link>
              </li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Gyakori kérdések</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Kapcsolat</a></li>
              <li>
                <a
                  href="mailto:info@vbfpremium.hu?subject=VBF%20Premium%20%E2%80%93%20visszajelz%C3%A9s&body=K%C3%B6rnyezet%20%2F%20b%C3%B6ng%C3%A9sz%C5%91%3A%20"
                  className="hover:text-primary transition-colors inline-flex min-h-11 items-center gap-2 text-left"
                >
                  <span className="h-2 w-2 shrink-0 rounded-full bg-primary/80" aria-hidden />
                  Visszajelzés (e-mail)
                </a>
              </li>
            </ul>
          </div>

          {/* Oszlop 4: Jogi */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[var(--text-main)]">Jogi</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li>
                <a href={legalUrls.terms} className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  Felhasználási feltételek
                </a>
              </li>
              <li>
                <a href={legalUrls.aszf} className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  ÁSZF
                </a>
              </li>
              <li>
                <a href={legalUrls.privacy} className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  Adatvédelmi tájékoztató
                </a>
              </li>
              <li>
                <a href={legalUrls.imprint} className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  Impresszum
                </a>
              </li>
              <li>
                <a href={legalUrls.legalNotice} className="hover:text-primary transition-colors min-h-11 inline-flex items-center">
                  Jogi nyilatkozat
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-[var(--border-color)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-[var(--text-muted)] mt-8">
          <div>
            &copy; 2026 VBF Premium SaaS. Minden jog fenntartva. <span className="font-semibold">Készült a magyar villanyszerelőkért.</span>
          </div>
          <div className="text-xs">
            Az oldal a bejelentkezéshez és a működéshez szükséges adatokat tárolja. Részletek:{' '}
            <a
              href={legalUrls.privacy}
              className="text-[var(--text-main)] hover:underline font-semibold min-h-11 inline-flex items-center"
            >
              Adatkezelési tájékoztató
            </a>
            .
          </div>
        </div>
      </footer>
    </div>
  );
}
