# VBF – Frontend rétegek és átlátható felosztás

A frontend három külön HTML rétegben van szervezve. Így a webshop, a cég admin és a jegyzőkönyv készítő elkülönül, könnyebb a karbantartás és a tájékozódás.

## Rétegek áttekintése

```
┌─────────────────────────────────────────────────────────────────┐
│  index.html  —  WEBSHOP (Főoldal)                                │
│  Árazás, vásárlás (Stripe / utalás), kapcsolat.                  │
│  Regisztráció = vásárlás. Sikeres fizetés után itt landol a user.│
└───────────────────────────┬─────────────────────────────────────┘
                            │ Belépés (Jegyzőkönyv) / Vásárlás
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  app.html  —  JEGYZŐKÖNYV ALKALMAZÁS                            │
│  Naptár & feladatok, rajz, jegyzőkönyv adatok, hibajegyzék,     │
│  mérések, mentett ügyek, törzsadatok.                           │
│  Adminnak: „Cég admin” link → shop.html                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │ Cég admin (csak admin)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  shop.html  —  CÉG ADMIN / WEBSHOP RÉTEG                         │
│  Dashboard (KPI, grafikonok, közelgő vizsgálatok)                │
│  Admin: felhasználók, cégek, csomagok, megrendelések,            │
│  fizetési előzmények, céges beállítások, munkakiosztás.          │
│  Link vissza: „Jegyzőkönyv alkalmazás” → app.html                │
└─────────────────────────────────────────────────────────────────┘
```

## Fájlok és szerepük

| Fájl | Entry JS | Tartalom |
|------|----------|----------|
| **index.html** | Inline script | Landing, árképzés, Stripe checkout, utalás űrlap, kapcsolat, sikeres vásárlás üzenet. |
| **app.html** | `js/main.js` | Rajz, jegyzőkönyv, hibajegyzék, mérések, naptár (jobs), mentett ügyek, törzsadatok. Cég admin link (adminnak). |
| **shop.html** | `js/shop.js` | Dashboard tab + Admin tab (felhasználók, cégek, csomagok, megrendelések, céges adatok, feladat kiosztása). |

## Navigáció

- **Főoldalról:** „Belépés (Jegyzőkönyv)” → `app.html`; „Vásárlás / Regisztráció” → `#shop` (index).
- **App-ból:** „Cég admin” → `shop.html` (csak ADMIN/SUPER_ADMIN).
- **Shop-ból:** „Jegyzőkönyv alkalmazás” → `app.html`; brand → `index.html`.

## Backend

Egyetlen FastAPI alkalmazás (`backend/`): mindhárom réteg ugyanazt az API-t használja (`/api/...`). A jogosultságokat a backend (RBAC) kezeli.
