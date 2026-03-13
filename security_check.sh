#!/usr/bin/env bash
set -euo pipefail

# Egyszerű biztonsági ellenőrző script a VBF backendhez.
# Használat:
#   chmod +x security_check.sh
#   ./security_check.sh
#
# Előfeltételek VPS-en:
#   - curl, jq, openssl telepítve
#     pl.: sudo apt update && sudo apt install -y curl jq openssl

# ── Beállítások ────────────────────────────────────────────────

# A VPS-en futó backend publikus URL-je (pl. https://vbf-staging.example.hu)
BASE_URL="${BASE_URL:-http://localhost:8000}"

# Teszt felhasználók (állítsd be a saját staging/test adataidnak megfelelően)
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-TesztJelszo123}"
TECH_USER="${TECH_USER:-tech}"
TECH_PASS="${TECH_PASS:-TechJelszo123}"

echo "[i] BASE_URL = $BASE_URL"

# ── 1) Admin login + token megszerzése ────────────────────────
echo "[i] Admin login próbálkozás..."
ADMIN_TOKEN=$(curl -sk -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=$ADMIN_USER&password=$ADMIN_PASS" | jq -r '.access_token // empty' || true)

if [ -z "${ADMIN_TOKEN:-}" ]; then
  echo "[!] Nem sikerült admin token-t szerezni. Ellenőrizd az ADMIN_USER / ADMIN_PASS értékeket (env-ben vagy a script tetején)."
  exit 1
fi
echo "[+] Admin token OK"

# ── 1/b) TECH token (opcionális) ──────────────────────────────
echo "[i] TECH login próbálkozás..."
TECH_TOKEN=$(curl -sk -X POST "$BASE_URL/api/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "username=$TECH_USER&password=$TECH_PASS" | jq -r '.access_token // empty' || true)

if [ -z "${TECH_TOKEN:-}" ]; then
  echo "[!] TECH token nem elérhető (nem fatal), jogosultság-teszt egy része kimarad."
else
  echo "[+] TECH token OK"
fi

# ── 2) Login brute-force / rate limit teszt (/api/login) ──────
echo "[i] Login brute-force / rate limit teszt (10 rossz jelszó)..."
for i in $(seq 1 10); do
  code=$(curl -sk -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/login" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    --data "username=$ADMIN_USER&password=ROSSZ$i" || true)
  echo "  próbálkozás $i → HTTP $code"
done

# ── 3) Admin endpointok TECH tokennel (jogosultság teszt) ─────
if [ -n "${TECH_TOKEN:-}" ]; then
  echo "[i] Admin endpoint próba TECH tokennel (/api/admin/users)..."
  curl -sk -D - "$BASE_URL/api/admin/users" \
    -H "Authorization: Bearer $TECH_TOKEN" -o /dev/null || true
fi

# ── 4) Public report megosztás + public access teszt ──────────
echo "[i] Létrehozunk egy teszt reportot adminnal..."
REPORT_ID=$(curl -sk -X POST "$BASE_URL/api/reports" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pentest teszt report","report_type":"vbf_idoszakos"}' | jq -r '.id // empty' || true)

if [ -z "${REPORT_ID:-}" ]; then
  echo "[!] Nem sikerült teszt reportot létrehozni, további report-tesztek kimaradnak."
else
  echo "[+] Létrehozott report ID: $REPORT_ID"

  echo "[i] Megosztási link létrehozása..."
  SHARE_JSON=$(curl -sk -X POST "$BASE_URL/api/reports/$REPORT_ID/share" \
    -H "Authorization: Bearer $ADMIN_TOKEN" || true)
  TOKEN=$(echo "$SHARE_JSON" | jq -r '.token // empty' || true)
  if [ -n "${TOKEN:-}" ]; then
    echo "[+] Megosztási token: $TOKEN"

    echo "[i] Publikus JSON lekérés..."
    curl -sk "$BASE_URL/api/public/report/$TOKEN" | jq . || true

    echo "[i] Random (hibás) token próbák (3 db)..."
    for i in $(seq 1 3); do
      fake_token=$(openssl rand -hex 16)
      code=$(curl -sk -o /dev/null -w "%{http_code}" "$BASE_URL/api/public/report/$fake_token" || true)
      echo "  fake token $i → HTTP $code (várt: 404)"
    done
  else
    echo "[!] Nem sikerült megosztási tokent generálni."
  fi
fi

# ── 5) padfx upload teszt (auth + rate limit) ─────────────────
echo "[i] padfx parse auth nélkül (várt: 401/403)..."
code=$(curl -sk -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/padfx/parse" \
  -F "file=@/etc/hosts" || true)
echo "  HTTP $code"

echo "[i] padfx parse admin tokennel, 7 gyors kérés (rate limit teszt)..."
for i in $(seq 1 7); do
  code=$(curl -sk -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/padfx/parse" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -F "file=@/etc/hosts" || true)
  echo "  kérés $i → HTTP $code"
done

# ── 6) Stripe webhook aláírás nélküli event (STAGING/TEST) ────
echo "[i] Stripe webhook teszt (aláírás nélkül – CSAK staging/test környezeten futtasd!)"
TEST_PAYLOAD='{"type":"checkout.session.completed","data":{"object":{"id":"cs_test_fake","customer_details":{"email":"test@example.com","name":"Teszt Vevő"},"amount_total":990000,"metadata":{"plan_type":"yearly"}}}}'
code=$(curl -sk -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/payments/webhook" \
  -H "Content-Type: application/json" \
  --data "$TEST_PAYLOAD" || true)
echo "  HTTP $code (prod ENV-ben várt: 500 vagy 400 invalid signature)"

echo "[+] security_check.sh lefutott."

