import { useState } from "react";
import { cn } from "../../lib/utils";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Béta verzió – hogyan küldhetek visszajelzést?",
      a: "A VBF Premiumot jelenleg béta verzióban fejlesztjük és tesszük egyre jobbá. Ha valami nem úgy működik, ahogy kellene, furcsán jelenik meg a képernyőn, vagy van ötleted a javításhoz: kattints a \"Visszajelzés küldése\" linkre vagy gombra a főoldalon, a jegyzőkönyv-készítőben vagy a cég admin felületen. A böngésző megnyitja a leveledet egy előre kitöltött sablonnal (melyik oldalon voltál, milyen böngészőt használsz) – így gyorsabban rá tudunk nézni."
    },
    {
      q: "Mi a VBF Premium, és kinek való?",
      a: "A VBF Premium egy magyar, felhőalapú villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyv szoftver – villanyszerelőknek, villamos szakembereknek és villamos biztonsági vizsgálatot végző cégeknek. VBF szakértő készítette: egy helyen jegyzőkönyv, elosztó rajz, Metrel PADFX mérésimport, hibajegyzék. MSZ HD 60364, OTSZ szerinti sablonok. Tableten és telefonon is használható böngészőből; a felhőbe mentéshez és exporthoz internet kell."
    },
    {
      q: "Milyen csomagok vannak, és mennyibe kerül?",
      a: "Havi és éves csomag is van: a havit havonta számlázzuk, az éveset egyszerre fizeted, és így olcsóbban jössz ki. Ha több felhasználóval vagy több jegyzőkönyvvel dolgozol, írj az info@vbfpremium.hu címen, és egyedi árat készítünk."
    },
    {
      q: "Hogyan tudok fizetni?",
      a: "Jelenleg utalásos számla alapján. Kosárba teszed a csomagot, megadod a számlázási adatokat, és elkészítjük a számlát. A hozzáférést az utalás jóváírása és admin jóváhagyás után aktiváljuk."
    },
    {
      q: "Kipróbálhatom ingyen vagy próbaidővel?",
      a: "Nagyobb csomagnál vagy partneri együttműködésnél tudunk próbaidőt vagy demót adni. Írj az info@vbfpremium.hu címre, 1–2 munkanapon belül válaszolunk."
    },
    {
      q: "Hány gépen/eszközön használhatom az előfizetést?",
      a: "Az előfizetés felhasználóhoz (e-mail címhez) kötött, de ezen belül bármennyi eszközön futtathatod egyszerre: PC-n, tableten és telefonon is be lehetsz jelentkezve párhuzamosan."
    },
    {
      q: "Mi történik, ha nincs internet a helyszínen?",
      a: "A munkát a böngészőben elkezdheted és a piszkozat egy része helyben is megmaradhat, de a felhőbe mentés, a szerveres szinkron és a Word/PDF export **internet nélkül nem működik**. Ha nincs térerő, jegyzetelj vagy mérj offline műszerrel, majd add meg a méréseket, amikor újra van kapcsolat — teljes telepíthető offline PWA jelenleg nem ígért funkció."
    },
    {
      q: "A VBF és EPH jegyzőkönyv sablonok megfelelnek az MSZ-nek és az OTSZ-nek?",
      a: "Igen. A villamos biztonsági felülvizsgálati (VBF) és EPH jegyzőkönyvek sablonjai az MSZ HD 60364-6, TvMI 7 és OTSZ előírásainak megfelelnek. Wordbe és PDF-be exportálható, saját céges logóval és aláírással."
    },
    {
      q: "Be tudom tölteni a Metrel mérő PADFX méréseit a VBF jegyzőkönyvbe?",
      a: "Igen. A Metrel PADFX fájlt feltöltöd a felületen, a program felismeri a hurok-, szigetelés- és RCD méréseket, és beírja őket a villamos biztonsági felülvizsgálati jegyzőkönyvbe. Ha valamelyik érték nem felel meg, a hibajegyzékhez automatikusan bekerül a szabványos leírás."
    },
    {
      q: "Vállaltok egyedi fejlesztést (pl. saját céges logó, saját jegyzőkönyv formátum)?",
      a: "Igen, a 'Céges / Egyedi' csomag pontosan erről szól. Ha speciális jegyzőkönyvre van szükségetek, vagy API integrációt szeretnél a meglévő ERP rendszereddel, vedd fel velünk a kapcsolatot!"
    },
    {
      q: "Milyen gépen, telefonon vagy tableten lehet használni?",
      a: "Bármilyen modern böngészőben megy (Chrome, Firefox, Edge, Safari), asztali gépen, laptopon, tableten vagy telefonon. A rajzolás és a terepi munka tableten is jól használható; a mentés a felhőbe és az export hálózattal történik."
    },
    {
      q: "Biztonságban vannak az adataim?",
      a: "Igen. Az adatkezelésünk a GDPR-nak megfelel, csak azt tároljuk, ami a bejelentkezéshez és a program használatához kell."
    },
    {
      q: "Mikor és hogyan jön meg a számla?",
      a: "A számlát a kosárban megadott adatok alapján kézzel állítjuk ki, majd e-mailben elküldjük. Minden vásárláshoz magyar számlát adunk."
    }
  ];

  return (
    <section id="faq" className="relative py-24 bg-[var(--bg-main)] border-y border-[var(--border-color)] overflow-hidden">
      {/* Glow */}
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-input)] text-[var(--text-main)] px-4 py-1.5 rounded-full text-sm font-bold border border-[var(--border-color)] shadow-sm">
            Tudástár
          </div>
          <h2 className="text-4xl font-extrabold text-[var(--text-main)] tracking-tight">Gyakori kérdések</h2>
          <p className="text-xl text-[var(--text-muted)] leading-relaxed">
            Nem találod a választ a kérdésedre? Írj nekünk bátran a Kapcsolat menüpontban.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={cn(
                  "bg-[var(--bg-main)] border rounded-2xl overflow-hidden transition-all duration-300",
                  isOpen ? "border-primary/50 shadow-[0_4px_20px_rgba(59,130,246,0.1)]" : "border-[var(--border-color)] hover:border-primary/30"
                )}
              >
                <button
                  className="w-full px-6 md:px-8 py-5 flex items-center justify-between gap-4 text-left outline-none"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <span className={cn(
                    "font-bold text-lg transition-colors",
                    isOpen ? "text-primary" : "text-[var(--text-main)]"
                  )}>
                    {faq.q}
                  </span>
                  <div className={cn(
                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300",
                    isOpen ? "bg-primary text-white rotate-180" : "bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-muted)]"
                  )}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                  </div>
                </button>
                <div
                  className={cn(
                    "px-6 md:px-8 text-[var(--text-muted-strong)] text-[15px] leading-relaxed overflow-hidden transition-all duration-300 ease-in-out border-t border-transparent",
                    isOpen ? "max-h-96 py-5 opacity-100 visible border-[var(--border-color)]/30" : "max-h-0 py-0 opacity-0 hidden"
                  )}
                >
                  {faq.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
