# Élesítés ~5 percben

## 1. Környezeti változók (backend)

Állítsd be a szerveren (`.env` vagy systemd/shell):

```bash
# Kötelező éleshez
SECRET_KEY="valodi-titkos-kulcs-min-32-karakter"
JWT_EXPIRE_MINUTES=1440
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Adatbázis — éles SaaS-hoz ajánlott: PostgreSQL
# Ha nincs DATABASE_URL, a backend SQLite fájlt használ (DATABASE_PATH vagy ./data/vbf_database.db).
# Python csomag: psycopg2-binary (requirements.txt).
# Példa (jelszóban speciális karakterek: URL-kódolás, vagy egyszerű jelszó):
# DATABASE_URL="postgresql://vbf:A_jelszo@db.example.com:5432/vbf"
# Railway/Heroku stílusú postgres:// URL is elfogadott (automatikusan postgresql://-re normalizálódik).

# Opcionális / fejlesztői alapértelmezés
# DATABASE_URL="sqlite:///./data/vbf_database.db"
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

### PostgreSQL (éles SaaS)

- **Séma (Alembic):** induláskor `alembic upgrade head` (a `main.py` → `database.init_db()` hívja), majd `subscription_plans` seed, ha üres. Új migráció: `cd backend && DATABASE_URL=... alembic revision --autogenerate -m "leírás"` → ellenőrizd a diffet, commitold a `alembic/versions/` fájlt.
- **SQLite (fejlesztői fájl):** továbbra is `create_all` + régi `ALTER` / PRAGMA migrációk — **nem** az Alembic lánc része.
- **SQLite → Postgres adat:** `backend/migrate_sqlite_to_postgres.py` (cél felé először Alembic séma, majd sorok másolása).
- **Pool (opcionális):** `DB_POOL_SIZE` (alap 5), `DB_MAX_OVERFLOW` (alap 10) — több uvicorn worker esetén érdemes számolni.
- **Docker:** `docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d --build` — `POSTGRES_PASSWORD` kötelező. A `db-backup` profil SQLite fájlra ment; Postgreshez: `backend/scripts/pg_backup.sh` vagy managed backup.
- **Mentés (Postgres):** `pg_dump "$DATABASE_URL" | gzip > backup.sql.gz` vagy a fenti szkript.

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

## 5. Health, státusz oldal, megfigyelhetőség

- **API probe:** `GET /health` — SQL `SELECT 1`; válasz: `{"status":"ok"}` vagy `503` + hiba (Kubernetes / load balancer ezt használhatja).
- **Nyilvános UI:** a frontend **`/status`** oldala (auth nélkül) ugyanezt hívja, válaszidővel — felhasználói átláthatóság; nem helyettesíti a külső uptime monitorozást.
- **Sentry / hibák:** opcionális `SENTRY_DSN` a backend környezetben (ha a build támogatja).
- **Mentés:** SQLite fájl / Postgres — lásd fent §1 (`pg_dump`, `scripts/pg_backup.sh`, managed DB backup).
- **GDPR (felhasználói UI):** a React app **`/app/data`** oldala — `GET /api/users/me/data-export`, `GET /api/users/me/data-export-zip`, `DELETE /api/users/me` (törlés előtt export ajánlott).

---

## 6. Gyors ellenőrzés

1. Backend: `GET /health` → `{"status":"ok"}` (és a böngészőben: `/status`)
2. Nyisd meg az `index.html`-t (landing): árazás, jogi linkek, Belépés.
3. Belépés `app.html`-en az új adminnal.
4. Admin → Előfizetési csomagok, Cégek, egy teszt felhasználó.
5. Teszt vásárlás: Stripe test mode (`sk_test_...`) + teszt kártya.

---

**Összefoglalva**: SECRET_KEY + Stripe (live keys + webhook) + bootstrap-admin + ugyanaz a domain (vagy beállított API_BASE_URL). Ez kb. 5 perc, utána élesíthető.
