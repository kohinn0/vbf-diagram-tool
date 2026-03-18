# 1. szakasz: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. szakasz: Runner (Csak a produkciós fájlok)
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
# Itt másold be a backend fájljait is, ha egyben van a kettő
COPY . . 

EXPOSE 5173
CMD ["npm", "run", "start"]
