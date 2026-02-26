#!/bin/bash
# VBF Database Backup Script
# Napi futtatás ajánlott cron-ból: 0 2 * * * /app/scripts/backup.sh
#
# Használat Docker-ben:
#   docker exec vbf-backend /app/scripts/backup.sh
#
# Megtartás: Utolsó 30 nap backupjai

set -euo pipefail

BACKUP_DIR="/app/data/backups"
DB_PATH="/app/data/vbf_database.db"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/vbf_backup_${DATE}.db"
RETENTION_DAYS=30

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Check if database exists
if [ ! -f "${DB_PATH}" ]; then
    echo "[BACKUP] HIBA: Adatbázis nem található: ${DB_PATH}"
    exit 1
fi

# Use SQLite's .backup command for safe, consistent backups
# This works even while the database is being written to (WAL mode)
echo "[BACKUP] SQLite backup indítása: ${DB_PATH} → ${BACKUP_FILE}"
sqlite3 "${DB_PATH}" ".backup '${BACKUP_FILE}'"

# Verify backup
if [ -f "${BACKUP_FILE}" ]; then
    SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
    echo "[BACKUP] ✅ Sikeres! Méret: ${SIZE}"
    
    # Verify backup integrity
    INTEGRITY=$(sqlite3 "${BACKUP_FILE}" "PRAGMA integrity_check;" 2>/dev/null)
    if [ "${INTEGRITY}" = "ok" ]; then
        echo "[BACKUP] ✅ Integrity check: OK"
    else
        echo "[BACKUP] ⚠️ Integrity check HIBA: ${INTEGRITY}"
    fi
else
    echo "[BACKUP] ❌ Backup SIKERTELEN!"
    exit 1
fi

# Compression (ha gzip elérhető)
if command -v gzip &> /dev/null; then
    gzip "${BACKUP_FILE}"
    echo "[BACKUP] Tömörítve: ${BACKUP_FILE}.gz"
fi

# Retention: Töröljük a régi backupokat
echo "[BACKUP] Régi backupok törlése (${RETENTION_DAYS} napnál régebbiek)..."
find "${BACKUP_DIR}" -name "vbf_backup_*.db*" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

# List remaining backups
BACKUP_COUNT=$(find "${BACKUP_DIR}" -name "vbf_backup_*" | wc -l)
echo "[BACKUP] Összesen ${BACKUP_COUNT} backup fájl van."
echo "[BACKUP] Kész."
