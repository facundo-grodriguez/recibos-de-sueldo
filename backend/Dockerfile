FROM node:22-slim AS build
WORKDIR /app
# El build nunca ejecuta Puppeteer (solo compila TypeScript) — se salta la
# descarga de Chromium acá, evitando depender de `unzip` en esta etapa. El
# runtime de abajo sí lo instala, vía el Chromium del sistema.
ENV PUPPETEER_SKIP_DOWNLOAD=true
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Chromium del sistema (apt) en vez del que Puppeteer descarga por su
# cuenta: apt resuelve automáticamente todas las librerías compartidas que
# Chromium necesita para correr (nss, atk, cairo, etc. — más de 20
# paquetes) sin listarlas una por una a mano, y evita duplicar ~300MB de
# descarga que ya bajó (sin usarse) en el stage de build.
RUN apt-get update \
  && apt-get install -y --no-install-recommends chromium \
  && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev
RUN npx prisma generate
COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
