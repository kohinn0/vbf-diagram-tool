/**
 * Egysoros elvi rajz szimbólumok — IEC 60617 (HD 637 S1/S2) és IEC 60417 jellegű egyszerűsített ábrák.
 * A vászon Fabric.js-sel SVG-ből épít; viewBox 32×32, vonalvastagság a szülő SVG-től.
 */

export interface SymbolDef {
  id: string;
  name: string;
  svgPath: string;
  isArch?: boolean;
}

export const powerSymbols: SymbolDef[] = [
  {
    id: 'mcb',
    name: 'Kismegszakító',
    /** S00219 jelleg: berendezés + kioldás (átlós jel a dobozban) */
    svgPath:
      '<path d="M16 2v6"/><rect x="9" y="8" width="14" height="14" rx="1" fill="none"/><path d="M16 8v14M16 22v8"/><path d="M12 12l8 8m0-8l-8 8" stroke-linecap="round"/>',
  },
  {
    id: 'rcd',
    name: 'FI relé (ÁVK)',
    /** Kétpólusú + áram-védő blokk (mérőelem téglalap) */
    svgPath:
      '<path d="M11 2v28M21 2v28"/><rect x="8" y="9" width="16" height="14" rx="1" fill="none"/><path d="M13 14h6M13 18h6" stroke-linecap="round"/>',
  },
  {
    id: 'meter',
    name: 'Fogyasztásmérő',
    /** Aktív energia: kör + jelölés (Wh) */
    svgPath:
      '<circle cx="16" cy="16" r="10" fill="none"/><path d="M16 9v14M10 16h12" stroke-linecap="round"/><text x="9" y="21" font-size="9" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">Wh</text>',
  },
  {
    id: 'spd',
    name: 'Túlfesz. levezető (SPD)',
    /** Védőelem + levezetés a PE felé */
    svgPath:
      '<path d="M16 2v7"/><rect x="9" y="11" width="14" height="8" rx="1" fill="none"/><path d="M12 15h8M13 13l6 4M19 13l-6 4"/><path d="M16 19v9"/><path d="M10 28h12" stroke-linecap="round"/>',
  },
  {
    id: 'fuse',
    name: 'Olvadóbiztosító',
    /** IEC: téglalap test + középen vezetősáv */
    svgPath:
      '<rect x="10" y="8" width="12" height="16" rx="1" fill="none"/><path d="M16 2v6m0 16v6"/><path d="M16 10v12" stroke-linecap="round"/>',
  },
  {
    id: 'switch',
    name: 'Kapcsoló (terheléskapcs.)',
    /** Nyitott érintkező — ferde penge */
    svgPath:
      '<path d="M16 2v8m0 12v10"/><path d="M16 10l8 9" stroke-linecap="round"/><circle cx="16" cy="22" r="1.8" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'contactor',
    name: 'Mágneskapcsoló',
    /** Tekercs + fő áramkör érintkezők */
    svgPath:
      '<rect x="5" y="9" width="10" height="14" rx="1" fill="none"/><path d="M10 2v7M10 23v7"/><path d="M22 2v28"/><path d="M15 11h12M15 19h12" stroke-linecap="round"/>',
  },
];

export const connectionSymbols: SymbolDef[] = [
  {
    id: 'terminal',
    name: 'Sorkapocs',
    svgPath:
      '<path d="M16 2v8"/><circle cx="16" cy="14" r="3.5" fill="none"/><path d="M16 17.5v10.5"/>',
  },
  {
    id: 'eph',
    name: 'EPH / egyenpotenciál',
    /** IEC 60417 5021 jelleg: kör + párhuzamos vonalak */
    svgPath:
      '<circle cx="16" cy="16" r="12" fill="none"/><path d="M9 14h14M9 18h14" stroke-linecap="round"/>',
  },
  {
    id: 'earth',
    name: 'Földelés',
    /** IEC 60417 5019: földelő sín / PE */
    svgPath:
      '<path d="M16 2v14M6 18h20M9 22h14M12 26h8" stroke-linecap="round"/>',
  },
  {
    id: 'busbar',
    name: 'Gyűjtősín (3F)',
    svgPath:
      '<path d="M3 11h26M3 16h26M3 21h26" stroke-linecap="round"/>',
  },
  {
    id: 'junction',
    name: 'Keresztezés / csomópont',
    /** Kereszt + középponti pont (csomópont) */
    svgPath:
      '<path d="M16 4v24M4 16h24"/><circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none"/>',
  },
  {
    id: 'transformer',
    name: 'Transzformátor',
    /** Két tekercs — két érintkező kör */
    svgPath:
      '<circle cx="16" cy="11" r="7" fill="none"/><circle cx="16" cy="21" r="7" fill="none"/><path d="M16 2v2m0 26v2"/>',
  },
];

export const consumerSymbols: SymbolDef[] = [
  {
    id: 'socket',
    name: 'Dugalj (230 V)',
    /** Aljzat ív + érintkezők */
    svgPath:
      '<path d="M16 3v5"/><path d="M9 14a7 7 0 0 0 14 0" fill="none"/><path d="M12 17v4M20 17v4" stroke-linecap="round"/><path d="M16 21v9"/>',
  },
  {
    id: 'socket_3p',
    name: 'Dugalj (400 V)',
    svgPath:
      '<path d="M16 3v5"/><path d="M8 14a8 8 0 0 0 16 0" fill="none"/><path d="M11 17v3m10 0v-3M16 20v-4" stroke-linecap="round"/><path d="M16 21v9"/>',
  },
  {
    id: 'light',
    name: 'Világítás',
    /** IEC: kör + kereszt (ált. lámpa) */
    svgPath:
      '<circle cx="16" cy="16" r="9" fill="none"/><path d="M9 9l14 14M23 9L9 23" stroke-linecap="round"/>',
  },
  {
    id: 'motor',
    name: 'Motor',
    svgPath:
      '<circle cx="16" cy="16" r="11" fill="none"/><text x="10.5" y="21" font-size="14" font-weight="600" fill="currentColor" stroke="none" font-family="system-ui,sans-serif">M</text>',
  },
  {
    id: 'heater',
    name: 'Fűtőtest',
    /** Ellenállás (cikk-cakk) */
    svgPath:
      '<rect x="7" y="11" width="18" height="10" fill="none"/><path d="M9 16h3l2-3 2 3 2-3 2 3 2-3h3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 3v8m0 12v8"/>',
  },
  {
    id: 'fan',
    name: 'Ventilátor',
    /** Forgógép + lapát jel */
    svgPath:
      '<circle cx="16" cy="16" r="10" fill="none"/><path d="M16 7v5M16 20v5M7 16h5M20 16h5" stroke-linecap="round"/>',
  },
];

export const archSymbols: SymbolDef[] = [
  {
    id: 'room',
    name: 'Szoba / tér',
    isArch: true,
    svgPath:
      '<rect x="3" y="3" width="26" height="26" fill="rgba(59,130,246,0.08)" stroke="currentColor" stroke-dasharray="3 2" stroke-width="1.5"/>',
  },
  {
    id: 'wall',
    name: 'Fal',
    isArch: true,
    svgPath:
      '<rect x="2" y="14" width="28" height="4" fill="currentColor" stroke="none" opacity="0.45"/>',
  },
  {
    id: 'door',
    name: 'Ajtó',
    isArch: true,
    svgPath:
      '<path d="M4 28V6h20v22" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M4 28h22" stroke="currentColor" stroke-width="1.5"/>',
  },
  {
    id: 'window',
    name: 'Ablak',
    isArch: true,
    svgPath:
      '<rect x="5" y="12" width="22" height="8" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5 16h22M16 12v8" stroke="currentColor" stroke-width="1.2"/>',
  },
];
