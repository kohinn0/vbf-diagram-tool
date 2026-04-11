# Üzleti stratégia — „jobb, mint a többi jegyzőkönyv-készítő”

**Cél:** a VBF Premium ne általános űrlap-/PDF-szerkesztő legyen, hanem a **magyar villamos biztonsági felülvizsgálati (VBF) szakma** számára **egyértelműen vezető** megoldás: szabványkövetés, nyomon követhetőség, mezőben használhatóság, céges működés.

**Nem cél:** „minden iparág” generic SaaS — a versenyelőny a **MSZ / NGM / OTSZ nyelvén beszélő**, **auditálható** jegyzőkönyv.

---

## 1. Mitől lehet jobb a piacon? (mérhető megkülönböztetők)

| Pillér | Mit jelent a felhasználónak | Hol tart a projekt (röviden) |
|--------|------------------------------|--------------------------------|
| **Szabvány és export** | Word/PDF szerkezet illeszkedik a §61.3 / §6.4.2 logikához; nem „üres sablon”. | Erős alap (`generator.py`); finomítás: kötelező mezők + üres szekciók elkerülése |
| **Mérés és import** | PADFX / mérési adatok **jegyzőkönyvbe**, nem mellékletbe csapva | PADFX XML + SQLite út megvan; tovább: CSV, hibák ↔ § hivatkozás |
| **Integritás** | Véglegesítés, zárolt állapot, hash / aláírás üzenet **értelmezhető** | Finalize + backend; kommunikációban kiemelni |
| **Cég / csapat** | Több felhasználó, limitek, admin, előfizetés — **SaaS**, nem fájlcsere | Megvan; P1: törzsadat választók, helyszínfa |
| **Mezőben használható** | Mobil, gyors mentés, egyértelmű hibák | Erős irány; PWA ígéret = tényleges állapot összhang (P1) |
| **Bizalom** | GDPR, törlés, export, nem „fekete doboz” | Megvan; éles: DPA, backup, monitoring |

---

## 2. Pozicionálás (egy mondat)

**„A szabványnak megfelelő VBF jegyzőkönyv és mérések egy rendszerben — exportálható, véglegesíthető, céges előfizetéssel.”**

Kerülendő állítások: „minden szabvány minden passzusa”, „jogszabály-szerű garancia” — a szakmai felelősség a felülvizsgálónál marad; a szoftver **támogatja és dokumentálja** a folyamatot.

---

## 3. Versenytársak (típusok) — hol győzhetsz

- **Általános űrlap / PDF kitöltők:** gyorsak, de **nincs MSZ-szerkezet, nincs PADFX, nincs VBF-specifikus validáció**.
- **Asztali / régi Win programok:** megszokott, de **nincs modern SaaS, mobil, csapat, felhő**.
- **„Minden szakmára” építők:** szélesek, de **sekélyek** a VBF-ben.

**Te erőd:** mély, magyar nyelvű, **egységes** rajz + jegyzőkönyv + mérések + hibák + export egy termékben.

---

## 4. Fejlesztési sorrend (üzleti hatás szerint)

### Lépésről lépésre (aktuális)

| Lépés | Státusz | Megjegyzés |
|-------|---------|------------|
| 1. Mérések **CSV export** (Excel HU: UTF-8 BOM, `;`) | **Kész** | `MeasurementsTab` + `lib/exportMeasurementsCsv.ts` |
| 2. **Helyszínfa** teljes szinkron + UX | **Kész (alap)** | `pruneMeasurementNodeRefs`, tipikus fa sablon, üres állapot szöveg |
| 3. Marketing / landing: **PWA** / offline | **Szöveg frissítve** | README, FAQ, How it works — nincs félrevezető offline ígéret |
| 4. Hibák ↔ **§ hivatkozás** | **Kész (alap)** | `standardRef` + generátor automatikus § ha üres |

### Rövid ütem (eredeti blokk)

1. **P1 — „Professzionálisabb, mint a Word-sablon”** — törzs választók megvannak; CSV export megvan; PWA / szöveg összhang hátra.

2. **P1+ — Cég szint** — helyszínfa + relációs sync; OTSZ végigvezetés finomítás.

3. **P2 — Vállalati / prémium** — audit log, webhook, offline/PWA ha kész; EPH / VVF (`VBF_PRODUCT_COMPLETENESS.md`).

---

## 5. Értékesítés / ügyfélkommunikáció (checklist)

- [ ] **Demó vagy videó:** 90 mp — rajz → mérés → hiba → export → véglegesítés  
- [ ] **ÁSZF / adatkezelés:** linkek élnek, nem „hamarosan”  
- [ ] **Árazás:** egyértelmű limit (jegyzőkönyv / felhasználó), nincs rejtett „kérdezzen árat”  
- [ ] **Support csatorna:** e-mail / űrlap válaszidő — prémium érzet  
- [ ] **Szerződés:** szakmai felelősség a felülvizsgálónál; a szoftver **eszköz**  

---

## 6. Kapcsolódó repo dokumentumok

- `docs/VBF_PRODUCT_COMPLETENESS.md` — szabvány-lefedettség, rések  
- `docs/P0_BACKLOG.md` — P0 kész, P1 következő  
- `PROGRAM_LEIRAS.md` — mit tud a kód ma  

---

*Utolsó frissítés: stratégiai keret; a sorrendet a piaci visszajelzéshez igazítsd.*
