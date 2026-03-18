# Pull Request: Shop frontend – biztonság és XSS javítások

## Cím (Title)

```
Shop frontend: initSanitize + XSS védelem (admin, dashboard)
```

## Leírás (Description)

A **shop.html** (cég admin / Dashboard oldal) és a hozzá tartozó modulok biztonsági átnézése és javítása: a shop oldal most már ugyanúgy inicializálja a sanitize réteget, és az Admin illetve a Dashboard minden felhasználói/API-származékú tartalmat escape-el, így XSS kockázat csökken.

### Változások

| Fájl | Változás |
|------|----------|
| **js/shop.js** | `initSanitize()` import és hívás hozzáadva (initToast után), hogy a shop oldalon is elérhető legyen a `VBF.sanitize` (escHtml, attr). |
| **js/ui/admin.js** | Csomagok: `display_name` és `features` teljes HTML escape. Függő megrendelések és fizetési előzmények táblázat: `email`, `customer_name`, `created`, `method`, `status` escape. Minden releváns catch ágban az `e.message` escape-elve. |
| **js/ui/dashboard.js** | Dashboard hibaüzenet: `err.message` escape. Közelgő/lejárt felülvizsgálatok lista: `site_address`, `title`, `customer_name`, `report_type`, `otsz_class`, `next_inspection_date` escape. |
| **frontend/SHOP_FRONTEND.md** | Új dokumentum: shop felület áttekintése, elvégzett javítások, opcionális további lépések, fájllista. |

### Tesztelés

- [ ] shop.html megnyitása, bejelentkezés admin/céges joggal
- [ ] Dashboard tab: statisztikák és közelgő vizsgálatok lista megjelenik, hiba esetén az üzenet escape-elt (ne legyen XSS)
- [ ] Admin tab: felhasználók, csomagok, függő megrendelések, fizetési előzmények listák megjelennek; csomag nevek/features és táblázat cellák escape-elve
- [ ] Nem regresszió: app.html Admin és egyéb funkciók továbbra is működnek (ugyanaz az admin.js)

### Kapcsolódó

- Biztonsági audit: `BIZTONSAGI_AUDIT.md` (XSS szakasz)
- Részletek: `frontend/SHOP_FRONTEND.md`
