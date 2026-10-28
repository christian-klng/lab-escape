# ---------- Build ----------
FROM node:22-alpine AS build
WORKDIR /app
# Erst nur die Paketdateien kopieren: Docker kann die Installation dann zwischenspeichern
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Auslieferung (rein statisch, für Coolify) ----------
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
# Coolify erkennt darüber, ob der Container bereit ist
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1
