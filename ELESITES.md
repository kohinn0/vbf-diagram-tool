# Élesítés ~5 percben

## 1. Környezeti változók (backend)

Állítsd be a szerveren (`.env` vagy systemd/shell):

```bash
# Kötelező éleshez
SECRET_KEY="valodi-titkos-kulcs-min-32-karakter"
JWT_EXPIRE_MINUTES=1440
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Opcionális
DATABASE_URL="sqlite:///./data/vbf_database.db"   # vagy PostgreSQL
SMTP_SERVER=...
SMTP_USER=...
SMTP_PASS=...
SENTRY_DSN=...

# Szamlazz.hu – automatikus számla fizetés után (lásd INTEGRACIOK.md)
# SZAMLAZZ_USER=...
# SZAMLAZZ_PASS=...
```

- **SECRET_KEY**: JWT aláíráshoz; generálj egy erős random stringet (min. 32 karakter).
- **JWT_EXPIRE_MINUTES**: Token érvényessége percben (pl. 1440 = 1 nap; alapértelmezett 7 nap).
- **Stripe**: Dashboard → Developers → API keys (live) + Webhook endpoint → signing secret.

---

## 2. Első főadmin

Indítás után hívjad meg egyszer (pl. curl vagy Postman):

```http
POST /api/dev/bootstrap-admin
Content-Type: application/json

{ "username": "admin", "password": "ErősJelszó123!" }
```

Ez létrehozza az első SUPER_ADMIN fiókot (ha még nincs user). Élesben utána tiltsd le vagy védetté tedd ezt az endpointot.

---

## 3. Frontend API címe

- **Fejlesztés**: `app.html`-t a Vite proxyval futtatod, `main.js`-ben `window.API_BASE_URL = ''` → a proxy kezeli.
- **Éles**: A frontend és az API **ugyanazon a domainen** legyen (pl. `https://vbf.example.com` + `https://vbf.example.com/api`). Ekkor az `index.html` automatikusan `origin + '/api'`-t használ (nem 8001).
- Ha a frontend és az API külön domainen van, a statikus fájlok buildjénél/HTML-jénél állítsd be: `window.API_BASE_URL = 'https://api.example.com/api';`

---

## 4. Stripe webhook

Stripe Dashboard → Webhooks → Add endpoint:

- **URL**: `https://TE_DOMAIN/api/payments/webhook`
- **Events**: `checkout.session.completed`
- A kapott **Signing secret** → `STRIPE_WEBHOOK_SECRET`

---

## 5. Gyors ellenőrzés

1. Backend: `GET /health` → `{"status":"ok"}`
2. Nyisd meg az `index.html`-t (landing): árazás, jogi linkek, Belépés.
3. Belépés `app.html`-en az új adminnal.
4. Admin → Előfizetési csomagok, Cégek, egy teszt felhasználó.
5. Teszt vásárlás: Stripe test mode (`sk_test_...`) + teszt kártya.

---

**Összefoglalva**: SECRET_KEY + Stripe (live keys + webhook) + bootstrap-admin + ugyanaz a domain (vagy beállított API_BASE_URL). Ez kb. 5 perc, utána élesíthető.
