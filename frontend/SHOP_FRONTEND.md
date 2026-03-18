# Shop frontend (shop.html) – áttekintés és teendők

A **shop.html** a cég admin / webshop felület: Dashboard + Admin tab. A logika a **shop.js** (belépési pont) és az **admin.js**, **dashboard.js**, **auth.js** modulokban van.

---

## Elvégzett javítások (biztonság / XSS)

1. **initSanitize() a shop.js-ben**  
   A shop oldal nem hívta az `initSanitize()`-t, ezért a `VBF.sanitize` (escHtml, attr) nem volt inicializálva. Most a shop is meghívja, így az admin és dashboard escape-elése ugyanúgy működik, mint az app.html-en.

2. **Admin (admin.js) – shop-on is használt**
   - **Csomagok lista:** `display_name` és `features` elemek teljes HTML escape (`escHtml`).
   - **Hibaüzenetek:** Csomag betöltés, függő megrendelések, fizetési előzmények, felhasználó lista – minden catch-ben az `e.message` escape-elve.
   - **Függő megrendelések táblázat:** `email`, `customer_name`, `created` escape.
   - **Fizetési előzmények táblázat:** `created`, `email`, `customer_name`, `method`, `status` escape.

3. **Dashboard (dashboard.js) – shop első tab**
   - **Hibaüzenet:** A „Hiba a dashboard betöltésekor” szövegben az `err.message` escape-elve.
   - **Közelgő / lejárt felülvizsgálatok lista:** `site_address`, `title`, `customer_name`, `report_type`, `otsz_class`, `next_inspection_date` escape-elve (API adat).

---

## Opcionális további lépések

- **Profil / Auth:** A profil modálban a felhasználó adatokat már `textContent`-tel állítod (auth.js), ez biztonságos.
- **Index.html webshop (árképzés, kosár):** Ha a főoldalon (index.html) van árképzés / kosár / vásárlás, azt külön érdemes átnézni (XSS, űrlap validáció). A jelen áttekintés a **shop.html** (cég admin) oldalra fókuszált.
- **Lokalizáció / hibaszövegek:** A shop felületen minden felhasználó felé megjelenő szöveg magyar; ha később több nyelv jön, érdemes központi szövegeket használni.
- **Akadálymentesség:** A tabok, gombok és modálok `aria-*` attribútumai és fókuszkezelés finomhangolása (pl. modal bezárás után fókusz visszaadása).

---

## Fájlok

| Fájl | Szerep |
|------|--------|
| `shop.html` | Cég admin oldal: Dashboard + Admin tab, bejelentkezési / profil / jelszó modálok, céges adatok, felhasználók, csomagok, megrendelések. |
| `js/shop.js` | Belépési pont: initToast, **initSanitize**, initThemeToggle, initTabs, initAdmin, initDashboard, initAuth. |
| `js/ui/admin.js` | Felhasználók, csomagok, függő megrendelések, fizetési előzmények, céges adatok (logó, aláírás, DOCX beágyazás), feladat kiosztás. |
| `js/ui/dashboard.js` | Dashboard statisztikák, diagramok, közelgő felülvizsgálatok. |
| `js/ui/auth.js` | Bejelentkezés, profil, jelszó módosítás, adatexport ZIP, fiók törlése. |
