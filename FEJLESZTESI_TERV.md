# VBF/EPH Jegyzőkönyv – Fejlesztési implementációs terv

Dokumentum verzió: 1.0  
Cél: a korábban megfogalmazott fejlesztési ötletek rangsorolt, lépésenként megvalósítható tervvé alakítása.

---

## 1. Prioritás és fázisok áttekintése

| Fázis | Fókusz | Becsült erőfeszítés | Függőség |
|-------|--------|----------------------|----------|
| **1** | Dokumentum + UX (céges sablon, kalibrálás emlékeztető) | közepes | nincs |
| **2** | Mérések (sablonok, egyszerű vizualizáció) | közepes | nincs |
| **3** | Rajz (sablonok, rajz → PDF) | közepes | nincs |
| **4** | Mobil/offline (PWA, offline mentés) | nagy | 1–2 |
| **5** | Integráció + audit (import bővítés, audit napló) | közepes–nagy | 1 |

---

## 2. Fázis 1 – Dokumentum és alap UX

**Cél:** Céges megjelenés egy helyen kezelhető, kalibrálás és következő vizsgálat emlékeztető látható.

### 1.1 Céges DOCX sablon (fejléc, lábléc, színek, logo) ✅ KÉSZ

- **Prioritás:** magas  
- **Fájlok:** `backend/generator.py`, `backend/database.py` (company_settings), `frontend/shop.html`, `frontend/js/ui/admin.js`, `backend/schemas.py`

**Lépések (elvégezve):**

1. **Adatmodell bővítés**
   - `company_settings` (vagy megfelelő tábla) mezői: `docx_header_text`, `docx_footer_text`, `docx_primary_color` (hex), `logo_base64` vagy `logo_path`.
   - Opcionális: `docx_font_name`, `docx_title_font_size`.

2. **Generator**
   - `generate_docx_stream()` elején: betölteni a cég/owner company_settings értékét (db-ből).
   - Fejléc/lábléc beállítás: Word `sections[0].header/footer` és a meglévő PAGE mező megtartása.
   - Színek: a generátorban a szabványos színhelyek (cím, táblázat fejléc) cseréje a `docx_primary_color`-ra (ha megvan).
   - Logo: ha van `logo_base64`/path, a borítólap vagy fejléc megfelelő helyére kép beszúrása (már van képkezelés a generatorban).

3. **Admin UI**
   - Beállítások oldal / „Céges megjelenés” szekció: szöveges mezők (fejléc, lábléc), színválasztó, logo feltöltés (→ base64 vagy fájl feltöltés backendre).
   - Mentés: PUT/PATCH `api/company-settings` vagy meglévő company endpoint bővítése.

4. **Teszt**
   - Új jegyzőkönyv → DOCX export → ellenőrizni fejléc/lábléc/szín/logo megjelenését.

### 1.2 Kalibrálás lejárat emlékeztető ✅ KÉSZ

- **Prioritás:** magas  
- **Fájlok:** `backend/routers/dashboard.py` (GET /api/dashboard/my-reminders), `frontend/app.html`, `frontend/js/ui/reports.js`, `main.js`, `auth.js`.

**Lépések (elvégezve):**

1. **Frontend – banner / badge**
   - Ahol a felhasználó belép (dashboard vagy „Jegyzőkönyvek” lista felett): ha van `instrumentCal` a legutóbb használt/megnyitott report `client_data`-jában, vagy külön „profil / beállítások” mezőben tárolt kalibrálás dátuma:
     - Ha lejárt: figyelmeztető banner (pl. piros): „A műszer kalibrálása lejárt (…)”.
     - Ha X napon belül lejár (pl. 30): sárga banner: „Kalibrálás lejár: YYYY-MM-DD”.
   - Ehhez: vagy minden mentésnél elmenteni a `instrumentCal`-t „user/company preference”-ként, vagy a report listából „legutóbbi inspection” alapján számolni (egyszerűbb: utolsó mentett report `client_data.instrumentCal`).

2. **Opcionális – backend lista**
   - GET `api/dashboard/calibration-reminder`: visszaadja a current_user-hoz tartozó legutóbbi `instrumentCal` értéket (pl. legutóbbi report client_data-jából) és a „napok a lejáratig” értéket.
   - Frontend ezt hívja, és a fenti bannert jeleníti meg.

3. **Teszt**
   - Két report: egy lejárt, egy 2 hét múlva járó kalibrálással → bannerek megfelelően jelennek meg.

### 1.3 Következő vizsgálat (OTSZ) emlékeztető ✅ KÉSZ

- **Prioritás:** közepes  
- **Fájlok:** ugyanaz a GET /api/dashboard/my-reminders adja az `upcoming_inspections` listát; `frontend` Cloud fülön „Közelgő következő vizsgálatok” blokk.

**Lépések (elvégezve):**

1. **Backend**
   - Új endpoint pl. GET `api/dashboard/next-inspection-reminders`:
     - Current user reportjai (scope szerint), ahol `client_data.nextInspectionDate` vagy OTSZ alapján számolt dátum X napon belül van (pl. 90 nap).
     - Válasz: lista `{ report_id, title, next_inspection_date, days_left }`.

2. **Frontend**
   - Dashboard vagy „Jegyzőkönyvek” oldalon egy blokk: „Közelgő következő vizsgálatok” – táblázat vagy kártyák, link a report megnyitásához.

3. **Opcionális**
   - Egyszerű e-mail (ha van SMTP): havi cron küldi a „közelgő következő vizsgálatok” összesítőt a user e-mailjére (későbbi fázis).

---

## 3. Fázis 2 – Mérések (sablonok, vizualizáció)

**Cél:** Gyors adatbevitel mérési sablonokkal, áttekinthető eredmények egyszerű grafikonokon.

### 2.1 Mérési sablonok („Lakás 3×B16 + 1×RCD” stb.) — **KÉSZ**

- **Prioritás:** magas  
- **Fájlok:** `frontend/js/ui/measurements.js`, `frontend/app.html`.

**Lépések:**

1. **Sablon definíció**
   - JSON struktúra pl. `{ "id": "lakas_alap", "name": "Lakás alap (3 áramkör + RCD)", "loop": [ { "circuit": "Világítás", "device": "B10" }, … ], "rcd": [ … ], "rpe": [ … ], "insulation": [ … ] }`.
   - Kezdés: 2–3 fix sablon (lakás alap, iroda alap) a frontendben vagy `public/templates/measurement-templates.json`-ben.

2. **Frontend**
   - Mérési adatok fülön: „Sablon betöltése” legördülő vagy gomb → sablon kiválasztása → a megfelelő táblázatok (loop, rcd, rpe, insulation) sorai `createRow`-kal feltöltődnek a sablon alapján.
   - Ütközés kezelése: „Hozzáfűz” vs „Felülír” (alapértelmezett: hozzáfűz).

3. **Opcionális – backend**
   - GET `api/measurement-templates`: listázza a sablonokat (céges egyedi sablonok is menthetők később company_settings vagy külön tábla alapján).

4. **Teszt**
   - Sablon kiválasztás → táblázatok kitöltődnek → mentés → DOCX-ben megjelennek a sorok.

### 2.2 Mérési eredmények egyszerű grafikonja — **KÉSZ**

- **Prioritás:** közepes  
- **Fájlok:** `frontend/app.html`, `frontend/js/ui/measurements.js` (Chart.js már használt).

**Lépések:**

1. **Adat**
   - A meglévő táblázatokból (loop, insulation, rcd) kinyerni az értékeket (Zs, Riso, RCD Idn/times) és egy „chart data” struktúrába rendezni.

2. **Vizualizáció**
   - Pl. bar chart: áramkör név (x) vs Zs (Ω) (y), referencia vonal (szabványérték).
   - Riso: L-N, L-PE, N-PE értékek oszlopokban.
   - RCD: Idn és t (ms) megjelenítés.

3. **Elhelyezés**
   - „Mérési adatok” fül alján vagy egy „Grafikon” alcím alatt; csak olvasható, a táblázat adatai alapján számolva.

4. **Teszt**
   - Töltött mérésekkel megnyitott report → grafikonok értelmesen jelennek meg, referencia értékek látszanak.

---

## 4. Fázis 3 – Rajz

**Cél:** Előre megrajzolt rajz sablonok, a canvas exportálása külön PDF-ként.

### 3.1 Rajz sablonok (Főelosztó + N alosztó) — **KÉSZ**

- **Prioritás:** közepes  
- **Fájlok:** `frontend/js/ui/canvas.js`, `frontend/app.html`.

**Lépések:**

1. **Sablon JSON-ok**
   - 1–2 előre exportált `canvas.toJSON()` (pl. „Főelosztó + 3 alosztó”, „Egyetlen elosztó”) a frontendben vagy statikus fájlban.

2. **UI**
   - Rajz fülön: „Sablon betöltése” gomb/legördülő → kiválasztott sablon JSON betöltése `canvas.loadFromJSON()` → render. Figyelni: „Felülírja a jelenlegi rajzot?” megerősítés.

3. **Opcionális**
   - Sablon szerkesztés (név, alapértelmezett szövegek) admin felületen vagy konfigban.

### 3.2 Rajz külön PDF export — **KÉSZ**

- **Prioritás:** alacsony–közepes  
- **Fájlok:** `backend/generator.py`, `backend/routers/reports.py`, `frontend/app.html`, `frontend/js/ui/reports.js`, `frontend/js/ui/auth.js`.

**Lépések:**

1. **Backend**
   - Új endpoint pl. GET `api/reports/{id}/export/diagram-pdf` (vagy a meglévő export mellett „format=diagram-pdf”):
     - Report `diagram_image` (base64) vagy `diagram_data` → kép generálás (ha csak data van, frontendről base64 képet küldeni lehet export előtt) → egyoldalas PDF (kép középre, A4).

2. **Frontend**
   - „Export” menü: „Rajz PDF” opció, ami meghívja az új endpointot és letölti a fájlt.

3. **Teszt**
   - Rajzot tartalmazó report → Rajz PDF letöltés → egyoldalas, olvasható PDF.

---

## 5. Fázis 4 – Mobil / offline

**Cél:** Helyszínen használható PWA, offline draft mentés és későbbi szinkron.

### 4.1 PWA alapok (manifest, service worker) — **KÉSZ**

- **Prioritás:** magas (ha mobil a cél)  
- **Fájlok:** `frontend/manifest.json`, `frontend/sw.js`, `frontend/app.html` (link + SW reg.).

**Lépések:**

1. **manifest.json**
   - name, short_name, start_url (pl. `/app.html`), display: standalone vagy minimal-ui, icons (legalább 192x192, 512x512).

2. **Service worker**
   - Cache stratégia: NetworkFirst vagy StaleWhileRevalidate a statikus asset-ekre; API hívások ne legyenek cache-elve (vagy csak explicit „offline queue” esetén).
   - Regisztráció a fő oldalon (pl. app.html betöltéskor).

3. **HTTPS**
   - PWA csak HTTPS-en (vagy localhost) működik; élesben kötelező.

### 4.2 Offline draft mentés és szinkron — **KÉSZ**

- **Prioritás:** magas  
- **Fájlok:** `frontend/js/ui/reports.js`, `frontend/js/storage.js`, `frontend/js/main.js`.

**Lépések:**

1. **Offline detektálás**
   - `navigator.onLine` + eseményfigyelő; UI jelzés: „Offline mód – a változtatások helyben lesznek mentve”.

2. **Draft mentés**
   - Meglévő „draft” logika kihasználása: offline esetén minden mentés gomb (vagy auto-save) csak localStorage/IndexedDB-ba ír (ugyanaz a payload, amit a PUT `api/reports/{id}` kapna).

3. **Szinkron queue**
   - Offline során történt „mentések” (pl. report_id + payload) tárolása egy queue-ban (pl. IndexedDB vagy localStorage tömb).
   - Online visszatéréskor: egymás után POST/PUT a queue elemeire; siker esetén törlés a queue-ból, hiba esetén újrapróbálkozás vagy felhasználói értesítés.

4. **Konfliktus**
   - Egyszerű stratégia: „utolsó írás nyer” (server state felülírása a queue-beli adattal). Később: verzió vagy last_updated ellenőrzés.

5. **Teszt**
   - DevTools → Network → Offline; szerkesztés, mentés; majd Online → ellenőrizni, hogy a változások feldolgozódnak és megjelennek a szerveren.

---

## 6. Fázis 5 – Integráció és audit

**Cél:** Más mérő formátumok alap támogatása, részletesebb audit napló.

### 5.1 Más mérő formátum (Fluke / Megger alap) — **KÉSZ**

- **Prioritás:** közepes  
- **Fájlok:** `backend/analyzer2.py`, `backend/routers/padfx.py`, `frontend/app.html`, `frontend/js/ui/padfx.js`.

**Lépések:**

1. **Formátum kutatás**
   - Egy konkrét formátum (pl. Fluke CSV vagy Megger export) dokumentációja / minta fájlok; mezők megfeleltetése: áramkör, Zs, Riso, RCD, stb.

2. **Parser**
   - Új függvény pl. `parse_fluke_csv(content)` → ugyanaz a struktúra, amit a PADFX parser ad (measurements list, type, location, results, params).

3. **Endpoint**
   - Pl. POST `api/import/parse-file`: Content-Type vagy fájl kiterjesztés alapján választ: PADFX (XML/SQLite) vs Fluke CSV vs …; meghívja a megfelelő parsert; válasz ugyanaz, mint a jelenlegi PADFX parse (measurements lista).

4. **Frontend**
   - Import gombnál: „Metrel PADFX” / „Fluke CSV” / … választás, vagy automatikus felismerés; a töltött sorok ugyanúgy kerülnek a táblázatokba, mint PADFX-nél.

### 5.2 Audit napló bővítés (ki nyitotta / exportálta / finalizálta) — **KÉSZ**

- **Prioritás:** közepes (ha jogi/ügyfél igény van)  
- **Fájlok:** `backend/database.py`, `backend/routers/reports.py`, `backend/schemas.py`, `migrate_db.py`.

**Lépések:**

1. **Adatmodell**
   - Új tábla pl. `report_audit_log`: report_id, user_id, action (opened / exported_docx / exported_pdf / finalized / …), created_at, opcionális meta (pl. IP, user_agent).
   - Vagy meglévő `audit_log` bővítése report_id és action mezőkkel.

2. **Rögzítés**
   - GET report (megnyitás): log „opened” (akár throttled: naponta 1 per user per report).
   - Export DOCX/PDF: log „exported_docx” / „exported_pdf”.
   - Finalize: log „finalized”.
   - Opcionális: share created/revoked.

3. **Lekérdezés**
   - GET `api/reports/{id}/audit-log` (csak jogosult user/company admin): lista time-orderben.
   - Admin/dashboard: „Napló” fül a report megtekintésénél, vagy külön „Audit” oldal céges szinten.

4. **Teszt**
   - Megnyitás, export, finalize → naplóbejegyzések megjelennek és helyesek.

---

## 7. Rövid idővonal javaslat (sprint jellegű)

| Hét / Sprint | Fázis | Konkrét deliverable |
|--------------|--------|----------------------|
| 1–2          | 1.1    | Céges DOCX sablon (fejléc, lábléc, logo, szín) működik, admin UI |
| 2–3          | 1.2–1.3| Kalibrálás + következő vizsgálat emlékeztető (banner + API) |
| 3–4          | 2.1    | 2–3 mérési sablon, „Sablon betöltése” a mérések fülön |
| 4–5          | 2.2    | Egyszerű Zs/Riso chart a mérési adatok alatt |
| 5–6          | 3.1    | 1–2 rajz sablon betölthető a canvasra |
| 6–7          | 3.2    | Rajz PDF export endpoint + gomb |
| 7–9          | 4.1–4.2| PWA manifest + SW; offline draft + szinkron queue |
| 9–10         | 5.1    | Egy másik formátum (pl. Fluke CSV) parser + import |
| 10–11        | 5.2    | Report audit log tábla + rögzítés + lekérdezés UI |

---

## 8. Következő lépés

- **Fázisok (1–5):** A fenti szekciókban a „✅ KÉSZ” jelölésű elemek már megvannak; a terv naprakész.
- **Fejlesztendő:** A **9. Fejlesztendő** szakasz foglalja össze a hátralevő opcionális ötleteket (táblázat + rövid prioritás). Innen érdemes választani a következő sprintet.
- **Dokumentum frissítése:** Minden elkészült elemnél jelezd a „Kész” állapotot a megfelelő szekcióban (és a 9.1 táblázatban), így a terv naprakész marad.

---

## 9. Fejlesztendő (hátralevő / opcionális)

A fázisok (1–5) és a korábbi „További ötletek” közül az alábbiak **még nincsenek megvalósítva** vagy opcionális bővítések. A már kész opciók jelölve vannak.

### 9.1 Opcionális ötletek – státusz

| Ötlet | Rövid leírás | Becslés | Státusz |
|-------|----------------|--------|---------|
| **E-mail havi összesítő** | Cron / ütemezett feladat: havi e-mail a közelgő vizsgálatokról és kalibrálásról (SMTP már van). | kicsi | ⬜ Fejlesztendő |
| **Jegyzőkönyv sablonok (teljes)** | Ügyfél típus (lakás/iroda/garázs) → client_data + méréssablon. | közepes | ✅ Kész |
| **Céges egyedi mérési sablonok** | Company szinten mentett mérési sablonok (DB), nem csak a 3 fix. | közepes | ✅ Kész |
| **Rajz → DOCX beágyazás opció** | Beállítás: rajz a DOCX-ben vagy csak Rajz PDF külön. | kicsi | ✅ Kész |
| **Publikus link lejárat** | ReportShareToken: opcionális `expires_at` a felhasználótól (7 nap, 30 nap). | kicsi | ⬜ Fejlesztendő |
| **Kétnyelvű DOCX** | Céges beállítás vagy report mező: dokumentum nyelve (hu/en), generator szövegei ennek megfelelően. | közepes | ⬜ Fejlesztendő |
| **VVF modul alapok** | Villámvédelmi felülvizsgálat: új report_type, űrlap és DOCX sablon váz. | nagy | ⬜ Fejlesztendő |
| **Mobil: „Add to Home Screen” promó** | PWA install prompt (beforeinstallprompt) kezelése. | kicsi | ⬜ Fejlesztendő |
| **Export előnézet (PDF/DOCX)** | „Előnézet” link: új lapon megnyitott dokumentum (blob URL) letöltés helyett. | kicsi | ⬜ Fejlesztendő |
| **Hibajegyzék sablonok export/import** | Tipikus hibák listájának exportálása JSON-ba, import más cég/telep számára. | kicsi | ⬜ Fejlesztendő |
| **Dashboard: „Ebben a hónapban” widget** | Új jegyzőkönyvek száma, finalizáltak, átlagos megfelelőség ebben a hónapban. | kicsi | ⬜ Fejlesztendő |
| **Verzió / changelog a láblécben** | DOCX/PDF láblécben opcionális „Generálva: VBF Cloud v1.2” (package.json vagy env). | kicsi | ⬜ Fejlesztendő |

### 9.2 Rövid prioritás – fejlesztendő (sorrend javaslat)

1. **Kicsi becslés, gyors haszon:** Publikus link lejárat, Export előnézet, „Add to Home Screen” promó, Verzió a láblécben, Dashboard „Ebben a hónapban” widget, Hibajegyzék sablonok export/import.
2. **Közepes:** E-mail havi összesítő, Kétnyelvű DOCX.
3. **Nagy (külön fázis):** VVF modul alapok.
