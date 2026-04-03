#!/usr/bin/env bash
# PostgreSQL mentés (cron / éles). Példa: DATABASE_URL=postgresql://user:pass@host:5432/vbf ./pg_backup.sh /backups
set -euo pipefail
OUT_DIR="${1:-.}"
mkdir -p "$OUT_DIR"
STAMP="$(date +%Y%m%d_%H%M%S)"
: "${DATABASE_URL:?Állítsd a DATABASE_URL-t (postgresql://...)}"
if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump nem található — telepítsd: postgresql-client (Debian/Ubuntu) vagy használj managed DB backupot." >&2
  exit 1
fi
pg_dump "$DATABASE_URL" | gzip -c > "${OUT_DIR}/vbf_pg_${STAMP}.sql.gz"
echo "OK: ${OUT_DIR}/vbf_pg_${STAMP}.sql.gz"
