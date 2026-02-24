#!/bin/bash

# =========================================================================
# VBF Tool - Automata Frissítő Szkript (Linux Szerverre)
# 
# Ezt a szkriptet elindíthatod manuálisan, vagy beállíthatod Cron
# feladatként is, hogy mondjuk minden éjjel 3:00-kor magától frissítsen!
# =========================================================================

# Navigálás oda, ahol a szkript található (a projekt gyökérkönyvtára)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "----------------------------------------------------"
echo "⚡ VBF Tool - Automatikus Frissítés Indítása: $(date)"
echo "----------------------------------------------------"

echo "[1/4] Legújabb kód letöltése a GitHub-ról..."
# Opcionálisan eltesszük a helyi (pl. tesztelésből maradt) módosításokat, hogy ne akadjon el a git pull
git stash -u >/dev/null 2>&1
git pull origin main

echo ""
echo "[2/4] Függőségek és környezet ellenőrzése..."
# Ha valakinek változott az IP-je, itt futhatna egy csere, de most hagyjuk alapárat
# (Vagy ha később külön enviroment-files lesz)

echo ""
echo "[3/4] Jelenlegi szolgáltatások (Dockerek) leállítása..."
# Docker Compose Version Control (Mindkettővel működjön: régi docker-compose és új docker compose)
if command -v docker-compose &> /dev/null; then
    docker-compose down
else
    docker compose down
fi

echo ""
echo "[4/4] Új szolgáltatások felépítése és indítása a háttérben..."
if command -v docker-compose &> /dev/null; then
    docker-compose up -d --build
else
    docker compose up -d --build
fi

echo "----------------------------------------------------"
echo "✅ Frissítés befejezve! Az alkalmazás újra fut: $(date)"
echo "----------------------------------------------------"
