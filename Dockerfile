FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de config
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Installer les dépendances (ignorer husky prepare)
RUN npm ci --ignore-scripts

# Copier tout le code
COPY . .

# Générer Prisma et builder l'API
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build:api

# --- Image de production ---
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
