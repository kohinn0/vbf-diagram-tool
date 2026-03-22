# 1. szakasz: Vite build (Tailwind, CSS chunkok – élesben csak a dist kell)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2. szakasz: nginx – ne a forrást szolgáljuk ki (ESM + CSS import böngészőben nem működik)
FROM nginx:alpine
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
# A HTML-ben maradt relatív utak (szakértő fotók, stb.) + PWA
COPY --from=builder /app/img /usr/share/nginx/html/img
COPY --from=builder /app/sw.js /usr/share/nginx/html/sw.js

EXPOSE 80
