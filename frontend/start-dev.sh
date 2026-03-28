#!/bin/bash
# Ez a szkript elindítja a React fejlesztői szervert egy Docker konténerben,
# így nem kell a saját gépeden a Node.js verziókkal trükközni!

echo "Telepítés és Vite szerver indítása Dockerben (Node 20)..."
docker run --rm -it \
  -v "$(pwd)":/app \
  -w /app \
  -p 5173:5173 \
  node:20 \
  bash -c "npm install --legacy-peer-deps && npm run dev -- --host 0.0.0.0"
