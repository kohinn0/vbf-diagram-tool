
import { useCartStore } from '../store/cartStore';
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
      <nav className="fixed top-0 inset-x-0 h-16 sm:h-20 bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)] z-50 flex items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-center text-primary font-extrabold shadow-sm">
            VBF
          </div>
          <span className="font-bold text-[var(--text-main)] text-xl hidden sm:block">VBF Premium</span>
        </div>
        
        <div className="hidden lg:flex items-center gap-6 font-semibold text-[var(--text-muted-strong)]">
          <a href="#features" className="hover:text-primary transition-colors">Funkciók</a>
          <a href="#about" className="hover:text-primary transition-colors">Rólunk</a>
          <a href="#how-it-works" className="hover:text-primary transition-colors">Működés</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Árak és Vásárlás</a>
          <a href="#partners" className="hover:text-primary transition-colors">Partnereink</a>
          <a href="#experts" className="hover:text-primary transition-colors">Szakemberkereső</a>
          <a href="#faq" className="hover:text-primary transition-colors">Gyakori kérdések</a>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
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
            className="hidden sm:block px-5 py-2.5 border border-[var(--border-color)] text-[var(--text-main)] bg-[var(--bg-input)] hover:bg-[var(--bg-card)] focus:ring-2 focus:ring-primary/20 font-bold rounded-xl transition-all shadow-sm hover:shadow"
          >
            Bejelentkezés
          </button>
          <a href="#pricing" className="px-5 py-2.5 bg-primary text-white hover:bg-primary-hover font-bold rounded-xl transition-all shadow-md shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5">
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
              <li><a href="#" className="hover:text-primary transition-colors">Dokumentáció</a></li>
              <li><a href="#faq" className="hover:text-primary transition-colors">Gyakori kérdések</a></li>
              <li><a href="#contact" className="hover:text-primary transition-colors">Kapcsolat</a></li>
              <li><button onClick={() => alert('Visszajelzés...')} className="hover:text-primary transition-colors text-left flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Visszajelzés (béta verzió)</button></li>
            </ul>
          </div>

          {/* Oszlop 4: Jogi */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[var(--text-main)]">Jogi</h4>
            <ul className="space-y-3 text-sm text-[var(--text-muted)] font-medium">
              <li><a href="#" className="hover:text-primary transition-colors">ÁSZF</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Adatvédelmi Nyilatkozat</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Impresszum</a></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-[var(--border-color)] pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-sm text-[var(--text-muted)] mt-8">
          <div>
            &copy; 2026 VBF Premium SaaS. Minden jog fenntartva. <span className="font-semibold">Készült a magyar villanyszerelőkért.</span>
          </div>
          <div className="text-xs">
            Az oldal a bejelentkezéshez és a működéshez szükséges adatokat tárolja. Részletek: <a href="#" className="text-[var(--text-main)] hover:underline font-semibold">Adatkezelési tájékoztató</a>.
          </div>
        </div>
      </footer>
    </div>
  );
}
